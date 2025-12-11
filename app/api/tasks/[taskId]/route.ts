import { NextRequest, NextResponse } from "next/server";             // Imports Next.js request/response helpers for building route handlers.
import { db } from "@/lib/db";                                       // Imports the Prisma client to talk to the database.
import { getDemoTenant } from "@/lib/demoTenant";                    // Imports helper to resolve demo company + user context.

/**
 * GET /api/tasks/:taskId
 * Fetch a single task by ID, including related entities.
 */
export async function GET(                                           // Defines the GET handler for fetching a single task.
  _req: NextRequest,                                                 // Incoming request (unused here, but part of the signature).
  context: { params: Promise<{ taskId?: string }> }                  // Route params provided by the app router as a Promise.
) {
  try {                                                              // Wrap the logic in try/catch for safe error handling.
    const { company } = await getDemoTenant();                       // Resolves the current company (multi-tenant context).

    const { taskId } = await context.params;                         // Awaits the params Promise and extracts the taskId.

    if (!taskId) {                                                   // If no taskId was provided in the URL...
      return NextResponse.json(                                     // Return a 400 Bad Request error to the client.
        { error: "Task ID is required" },                            // Explain that the ID is required.
        { status: 400 }                                              // HTTP 400 = client error.
      );
    }

    const task = await db.task.findFirst({                           // Queries the database for the task.
      where: {
        id: taskId,                                                  // Must match this specific task ID.
        companyId: company.id,                                       // Must belong to the current company.
      },
      include: {
        relatedCustomer: true,                                       // Include customer relation (if any).
        relatedLoad: true,                                           // Include load relation (if any).
        relatedInvoice: true,                                        // Include invoice relation (if any).
        user: true,                                                  // Include the assigned user.
      },
    });

    if (!task) {                                                     // If no matching task was found...
      return NextResponse.json(                                     // Return 404 Not Found to the client.
        { error: "Task not found" },                                 // Explain that the task does not exist.
        { status: 404 }                                              // HTTP 404 = resource not found.
      );
    }

    return NextResponse.json(task);                                  // On success, return the task object as JSON.
  } catch (err) {
    console.error("[TASK_GET_ERROR]", err);                          // Log any unexpected server-side error.
    return NextResponse.json(                                       // Return a 500 Internal Server Error.
      { error: "Failed to fetch task" },                             // Generic error message for the client.
      { status: 500 }                                                // HTTP 500 = internal server error.
    );
  }
}

/**
 * PATCH /api/tasks/:taskId
 * Partially update a task (status, order, notes, dueAt, relations).
 */
export async function PATCH(                                         // Defines the PATCH handler for updating a task.
  req: NextRequest,                                                  // Incoming request containing JSON body with updates.
  context: { params: Promise<{ taskId?: string }> }                  // Route params with the taskId to update.
) {
  try {                                                              // Wrap in try/catch so we can handle errors cleanly.
    const { company } = await getDemoTenant();                       // Resolves the current company context.

    const { taskId } = await context.params;                         // Awaits params and extracts taskId.
    if (!taskId) {                                                   // Guard: no taskId means invalid request.
      return NextResponse.json(
        { error: "Task ID is required" },                            // Inform client the ID is missing.
        { status: 400 }                                              // HTTP 400 = bad request.
      );
    }

    const body = await req.json();                                   // Parse JSON body from the request.

    const existing = await db.task.findFirst({                       // Fetch the existing task to merge updates.
      where: {
        id: taskId,                                                  // Match by primary key.
        companyId: company.id,                                       // Ensure it belongs to this company.
      },
    });

    if (!existing) {                                                 // If no task is found...
      return NextResponse.json(
        { error: "Task not found" },                                 // Tell the client the task does not exist.
        { status: 404 }                                              // HTTP 404 = resource not found.
      );
    }

    // ---- Handle status + completedAt logic ----
    const rawStatus = body.status as string | undefined;             // Read the new status from the body (if provided).
    const normalizedStatus = rawStatus                               // If we have a new status, normalize to uppercase.
      ? (rawStatus.toUpperCase() as typeof existing.status)
      : existing.status;                                             // Otherwise keep the current status.

    let nextCompletedAt = existing.completedAt;                      // Start from the existing completedAt value.

    if (rawStatus) {                                                 // Only adjust completedAt if status was explicitly updated.
      if (normalizedStatus === "DONE") {                             // If moving into DONE...
        if (!existing.completedAt) {                                 // ...and it was not previously completed...
          nextCompletedAt = new Date();                              // ...set completedAt to now.
        }
      } else {                                                       // For any non-DONE status...
        nextCompletedAt = null;                                      // ...clear completedAt so it remains accurate.
      }
    }

    const updated = await db.task.update({                           // Perform the actual update in the database.
      where: { id: taskId },                                         // Target the task by primary key.
      data: {
        status: normalizedStatus,                                    // Persist the new or existing status.
        order:
          body.order !== undefined                                   // If a new order was provided...
            ? Number(body.order)                                     // ...cast it to a number and save.
            : existing.order,                                        // Otherwise keep the current order.

        notes:
          body.notes !== undefined                                   // If notes was provided...
            ? body.notes ?? null                                     // ...allow null to clear, or string to set.
            : existing.notes,                                        // Otherwise keep existing notes.

        dueAt:
          body.dueAt !== undefined                                   // If dueAt was provided...
            ? body.dueAt                                             // ...interpret it as either null or date string.
              ? new Date(body.dueAt)                                 // If non-null, parse into a Date.
              : null                                                 // If null, clear due date.
            : existing.dueAt,                                        // Otherwise keep existing due date.

        type:
          body.type !== undefined                                    // If type was provided...
            ? body.type                                              // ...set it directly (must be a valid TaskType).
            : existing.type,                                         // Otherwise keep existing type.

        relatedCustomerId:
          body.relatedCustomerId !== undefined                       // If relatedCustomerId was provided...
            ? body.relatedCustomerId ?? null                         // ...set or clear it.
            : existing.relatedCustomerId,                            // Otherwise keep the current relation.

        relatedLoadId:
          body.relatedLoadId !== undefined                           // Same logic for related load.
            ? body.relatedLoadId ?? null
            : existing.relatedLoadId,

        relatedInvoiceId:
          body.relatedInvoiceId !== undefined                        // Same logic for related invoice.
            ? body.relatedInvoiceId ?? null
            : existing.relatedInvoiceId,

        completedAt: nextCompletedAt,                                // Persist the updated completedAt value.
      },
      include: {
        relatedCustomer: true,                                       // Include related customer in the response.
        relatedLoad: true,                                           // Include related load.
        relatedInvoice: true,                                        // Include related invoice.
        user: true,                                                  // Include assigned user.
      },
    });

    return NextResponse.json(updated);                               // Return the updated task as JSON.
  } catch (err) {
    console.error("[TASK_PATCH_ERROR]", err);                         // Log any server-side error for debugging.
    return NextResponse.json(
      { error: "Failed to update task" },                            // Generic error message for the client.
      { status: 500 }                                                // HTTP 500 = internal server error.
    );
  }
}

/**
 * PUT /api/tasks/:taskId
 * Alias to PATCH so existing clients using PUT keep working.
 */
export async function PUT(                                           // Defines the PUT handler.
  req: NextRequest,                                                  // Incoming request (same as PATCH).
  context: { params: Promise<{ taskId?: string }> }                  // Route params with taskId.
) {
  // Delegate to the PATCH handler so both PUT and PATCH behave identically.
  return PATCH(req, context);                                        // Calls PATCH with the same arguments.
}

/**
 * DELETE /api/tasks/:taskId
 * Permanently deletes a task.
 */
export async function DELETE(                                        // Defines the DELETE handler for removing a task.
  _req: NextRequest,                                                 // Incoming request (unused here).
  context: { params: Promise<{ taskId?: string }> }                  // Route params with the taskId to delete.
) {
  try {                                                              // Wrap in try/catch for safe error handling.
    const { company } = await getDemoTenant();                       // Resolve current company.

    const { taskId } = await context.params;                         // Await params and extract the task ID.

    if (!taskId) {                                                   // Guard: cannot delete without an ID.
      return NextResponse.json(
        { error: "Task ID is required" },                            // Inform client ID is missing.
        { status: 400 }                                              // HTTP 400 = bad request.
      );
    }

    const existing = await db.task.findFirst({                       // Ensure the task exists and belongs to this company.
      where: {
        id: taskId,                                                  // Match by ID.
        companyId: company.id,                                       // Scope to current company.
      },
    });

    if (!existing) {                                                 // If no task found...
      return NextResponse.json(
        { error: "Task not found" },                                 // Inform the client.
        { status: 404 }                                              // HTTP 404 = not found.
      );
    }

    await db.task.delete({                                           // Delete the task from the database.
      where: { id: taskId },                                         // Target by primary key.
    });

    return NextResponse.json({ success: true });                     // Return a simple success response.
  } catch (err) {
    console.error("[TASK_DELETE_ERROR]", err);                       // Log unexpected errors.
    return NextResponse.json(
      { error: "Failed to delete task" },                            // Generic error message.
      { status: 500 }                                                // HTTP 500 = internal server error.
    );
  }
}
