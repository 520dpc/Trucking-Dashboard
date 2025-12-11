import { NextRequest, NextResponse } from "next/server";          // Imports types/helpers for handling HTTP requests and JSON responses.
import { db } from "@/lib/db";                                    // Prisma client instance to talk to the database.
import { getDemoTenant } from "@/lib/demoTenant";                 // Helper that ensures we have a demo company + user.
import type { TaskStatus } from "@prisma/client";                 // Imports TaskStatus enum type to keep status values valid.

/**
 * GET /api/tasks
 * Optional query: ?status=PENDING|DONE|DISMISSED
 * Returns all tasks for the current company, ordered by (status, order, createdAt).
 */
export async function GET(req: NextRequest) {                     // Handles GET /api/tasks.
  try {                                                           // Wrap logic in try/catch for safe error handling.
    const { company } = await getDemoTenant();                    // Resolves the current company (multi-tenant context).

    const { searchParams } = new URL(req.url);                    // Parses the URL so we can read query parameters.
    const statusParam = searchParams.get("status");               // Reads ?status=... if provided.

    const where: any = {                                          // Builds a dynamic Prisma filter.
      companyId: company.id,                                      // Always scope to this company.
    };

    if (statusParam) {                                            // If caller passed a status filter...
      where.status = statusParam;                                 // ...filter tasks to that status.
    }

    const tasks = await db.task.findMany({                        // Fetches tasks from the database.
      where,                                                      // Apply our filter.
      orderBy: [                                                  // Order for stable Kanban display.
        { status: "asc" },                                        // 1) By status.
        { order: "asc" },                                         // 2) By per-column sort index.
        { createdAt: "asc" },                                     // 3) Tie-break by creation time.
      ],
      include: {                                                  // Include relations so UI can show linked entities.
        relatedCustomer: true,                                    // Linked customer (if any).
        relatedLoad: true,                                        // Linked load (if any).
        relatedInvoice: true,                                     // Linked invoice (if any).
        user: true,                                               // Assigned user.
      },
    });

    return NextResponse.json(tasks);                              // Send tasks as JSON (200 OK by default).
  } catch (err) {
    console.error("[TASKS_GET_ERROR]", err);                       // Log error for backend debugging.
    return NextResponse.json(                                     // Send a structured error response.
      { error: "Failed to fetch tasks" },                         // Error message.
      { status: 500 }                                             // HTTP 500 = internal error.
    );
  }
}

/**
 * POST /api/tasks
 * Creates a new task in the appropriate column with an "order" at the bottom of that column.
 *
 * Example body:
 * {
 *   "type": "CALL_CUSTOMER",
 *   "status": "PENDING",                // optional, defaults to PENDING
 *   "notes": "Call Acme about invoice",
 *   "relatedCustomerId": "...",         // optional
 *   "dueAt": "2025-12-09T15:00:00.000Z" // optional
 * }
 */
export async function POST(req: NextRequest) {                    // Handles POST /api/tasks.
  try {
    const { company, user } = await getDemoTenant();              // Ensures we have a demo company + user (assignee).

    const body = await req.json();                                // Parse incoming JSON body.

    // ---- SAFELY NORMALIZE STATUS TO A VALID ENUM ----
    const rawStatus: string | undefined = body.status;            // Read status from the body as a raw string (can be undefined).
    const upper = rawStatus?.toUpperCase();                       // Convert to uppercase so "pending" works too.

    const allowedStatuses: TaskStatus[] = [                       // Whitelist of allowed TaskStatus values from the enum.
      "PENDING",
      "DONE",
      "DISMISSED",
    ];

    const status: TaskStatus =                                    // Decide final status value to use.
      allowedStatuses.includes(upper as TaskStatus)               // If caller sent a valid status...
        ? (upper as TaskStatus)                                   // ...use it.
        : "PENDING";                                              // Otherwise default to PENDING.

    // ---- OPTIONAL DUE DATE HANDLING ----
    let dueAt: Date | null = null;                                // Start with no due date.
    if (body.dueAt) {                                             // If caller sent a dueAt field...
      const parsed = new Date(body.dueAt);                        // Attempt to parse it into a Date object.
      if (!Number.isNaN(parsed.getTime())) {                      // Only accept it if it's a valid date.
        dueAt = parsed;                                           // Store the valid Date.
      }
    }

    // ---- DETERMINE NEXT ORDER WITHIN THIS STATUS COLUMN ----
    const lastInColumn = await db.task.findFirst({                // Find the highest-order task in this column.
      where: {
        companyId: company.id,                                    // Same company.
        status,                                                   // Same status/column.
      },
      orderBy: {
        order: "desc",                                            // Largest order first.
      },
    });

    const nextOrder = (lastInColumn?.order ?? -1) + 1;            // If none exist, start at 0; otherwise last order + 1.

    // ---- CREATE THE TASK ----
    const task = await db.task.create({                           // Insert a new row into the Task table.
      data: {
        companyId: company.id,                                    // Owning company.
        userId: user.id,                                          // Assigned user.
        type: body.type ?? "CUSTOM",                              // Task type, default to CUSTOM if not provided.
        status,                                                   // Valid TaskStatus value we computed above.
        order: nextOrder,                                         // Place task at bottom of this status column.

        relatedCustomerId: body.relatedCustomerId ?? null,        // Optional link to a customer.
        relatedLoadId: body.relatedLoadId ?? null,                // Optional link to a load.
        relatedInvoiceId: body.relatedInvoiceId ?? null,          // Optional link to an invoice.

        dueAt,                                                    // Optional due date (null if none or invalid).
        notes: body.notes ?? null,                                // Optional notes (null if omitted).
      },
      include: {
        relatedCustomer: true,                                    // Include related customer in response.
        relatedLoad: true,                                        // Include related load.
        relatedInvoice: true,                                     // Include related invoice.
        user: true,                                               // Include assigned user.
      },
    });

    return NextResponse.json(task, { status: 201 });              // Send the created task as JSON with 201 Created.
  } catch (err: any) {
    console.error("[TASKS_POST_ERROR]", err);                      // Log the full error for debugging.

    // Try to surface a Prisma error message if present.
    const message =
      typeof err?.message === "string"
        ? err.message
        : "Failed to create task";                                // Fallback error text.

    return NextResponse.json(                                     // Return JSON error response.
      { error: message },                                         // Include the message so the client can show it.
      { status: 500 }                                             // HTTP 500 = internal server error.
    );
  }
}
