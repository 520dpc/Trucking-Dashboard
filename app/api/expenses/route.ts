import { NextRequest, NextResponse } from "next/server";                     // Provides types and helpers for handling HTTP requests and responses in Next.js API routes.
import { db } from "@/lib/db";                                               // Prisma client instance used to talk to the PostgreSQL database.
import { getDemoTenant } from "@/lib/demoTenant";                            // Helper that returns (or lazily creates) the demo Company + User pair for now.

// GET /api/expenses → list all expenses for the current company (demo tenant for now).
export async function GET(_req: NextRequest) {                               // Defines the GET handler for /api/expenses; Next.js calls this on incoming GET requests.
  try {                                                                      // Wrap logic in try/catch so we can return clean 500 responses on error.
    const { company } = await getDemoTenant();                               // Resolves the current company context (multi-tenant scope) using the demo tenant helper.

    const expenses = await db.expense.findMany({                             // Queries the Expense table for all expenses belonging to this company.
      where: {
        companyId: company.id,                                               // Scopes results to this specific company to enforce multi-tenancy.
      },
      orderBy: { incurredAt: "desc" },                                       // Sorts by incurred date, newest first, so the most recent expenses appear at the top.
    });

    return NextResponse.json(expenses);                                      // Returns the array of expenses as JSON with default 200 OK status.
  } catch (err) {                                                            // If anything throws above (DB issue, etc.)...
    console.error("[EXPENSES_GET_ERROR]", err);                              // Log the error with a clear tag for debugging on the server.
    return NextResponse.json(                                               // Respond with a generic 500 error payload.
      { error: "Failed to fetch expenses" },                                 // High-level error message; we avoid leaking internals.
      { status: 500 }                                                        // HTTP 500 = internal server error.
    );
  }
}

// POST /api/expenses → create a new expense for the current user + company.
export async function POST(req: NextRequest) {                               // Defines the POST handler for /api/expenses.
  try {
    const body = await req.json();                                           // Parses the incoming JSON body into a JavaScript object.
    const { company, user } = await getDemoTenant();                         // Resolves current company + user (demo tenant for now).

    const amountNumber = Number(body.amount);                                // Coerces the amount field to a number so Prisma can store it as Int.
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {               // Guard: amount must be a positive, finite number.
      return NextResponse.json(
        { error: "Amount must be a positive number" },                       // Clear error message for the client.
        { status: 400 }                                                      // HTTP 400 = bad input from the client.
      );
    }

    const isRecurring = Boolean(body.isRecurring);                           // Coerces isRecurring to a boolean so we can enforce rules reliably.
    const recurrenceFreq = body.recurrenceFreq ?? null;                      // Normalizes recurrence frequency; null if not provided.

    if (isRecurring && !recurrenceFreq) {                                    // Business rule: recurring expenses must specify a recurrence frequency.
      return NextResponse.json(
        { error: "recurrenceFreq is required when isRecurring is true" },    // Descriptive error so the frontend knows what to fix.
        { status: 400 }                                                      // HTTP 400 = client-side validation failure.
      );
    }

    const incurredAt = body.incurredAt                                      // Normalizes incurredAt to a Date object for Prisma.
      ? new Date(body.incurredAt)                                           // If provided, parse the date string.
      : new Date();                                                         // Otherwise default to "now".

    if (Number.isNaN(incurredAt.getTime())) {                               // Guard: ensure incurredAt is a valid date.
      return NextResponse.json(
        { error: "Invalid incurredAt date" },                                // Client passed a bad date string.
        { status: 400 }
      );
    }

    const expense = await db.expense.create({                               // Creates a new Expense row in the database.
      data: {
        // REQUIRED FOREIGN KEYS
        companyId: company.id,                                              // Attaches the expense to the current company (multi-tenant scope).
        userId: user.id,                                                    // Attaches the expense to the current user (who created it).

        // CORE FINANCIALS
        amount: Math.round(amountNumber),                                   // Stores the amount as an integer; currently treating input as whole dollars.

        description: body.description ?? null,                              // Optional description of the expense; null if missing.
        incurredAt,                                                         // When the expense was incurred (for reporting and period grouping).

        // CATEGORIZATION
        categoryGroup: body.categoryGroup ?? null,                          // Broad group (FUEL, MAINTENANCE, etc.) or null.
        categoryKey: body.categoryKey ?? null,                              // Normalized key derived from label (e.g., FUEL_DIESEL).
        label: body.label ?? null,                                          // Human-friendly label (e.g., "Pilot Diesel", "Truck Lease").

        isRecurring,                                                        // Boolean: whether this expense recurs.
        recurrenceFreq,                                                     // Frequency string (e.g., MONTHLY) or null if not recurring.

        // OPTIONAL LINKED ENTITIES
        loadId: body.loadId ?? null,                                        // Optionally tie this expense to a specific load.
        truckId: body.truckId ?? null,                                      // Optionally tie this expense to a truck.
        trailerId: body.trailerId ?? null,                                  // Optionally tie this expense to a trailer.
      },
    });

    return NextResponse.json(expense, { status: 201 });                     // Returns the created expense with HTTP 201 Created.
  } catch (err) {
    console.error("[EXPENSES_POST_ERROR]", err);                            // Logs the error for debugging.
    return NextResponse.json(                                               // Sends a generic 500 error payload to the client.
      { error: "Failed to create expense" },                                // Message indicates that creation failed.
      { status: 500 }                                                       // HTTP 500 = server-side failure.
    );
  }
}
