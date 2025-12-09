import { NextRequest, NextResponse } from "next/server";                       // \\ Next.js request/response helpers.
import { db } from "@/lib/db";                                                 // \\ Prisma client instance.
import { RecurrenceFreq } from "@prisma/client";                               // \\ Enum for recurrence frequency.

// Same demo auth helper as in /api/expenses to keep behavior consistent.      \\ Ensures GET/PUT/DELETE see the same company/user as list/create.
async function getDemoAuthContext() {                                          // \\ Returns { user, company } for demo mode.
  let user = await db.user.findFirst({                                         // \\ Attempt to find the demo user by email.
    where: { email: "demo@demo.com" },                                         // \\ Hard-coded demo email.
    include: { company: true },                                                // \\ Include company on the user if it exists.
  });

  if (user && user.company) {                                                  // \\ If user and company are both present...
    return { user, company: user.company };                                    // \\ ...reuse them to align with existing data.
  }

  let company;                                                                 // \\ Otherwise, resolve or create a company.

  if (user?.companyId) {                                                       // \\ If user has a companyId reference...
    company =
      (await db.company.findUnique({ where: { id: user.companyId } })) ||      // \\ Try to load that company.
      (await db.company.create({ data: { name: "Demo Company" } }));           // \\ If not found, create a new Demo Company.
  } else {                                                                     // \\ If no user or no companyId...
    company =
      (await db.company.findFirst()) ||                                        // \\ Reuse first company in DB if it exists...
      (await db.company.create({ data: { name: "Demo Company" } }));           // \\ ...or create a fresh Demo Company row.
  }

  if (!user) {                                                                 // \\ If we still don't have a user...
    user = await db.user.create({                                              // \\ ...create demo user tied to the resolved company.
      data: {
        email: "demo@demo.com",
        passwordHash: "placeholder",
        companyId: company.id,
        fullName: "Demo User",
      },
    });
  } else if (!user.companyId) {                                                // \\ If user existed but wasn't linked to company...
    user = await db.user.update({                                              // \\ ...update the user to attach the company.
      where: { id: user.id },
      data: { companyId: company.id },
    });
  }

  return { user, company };                                                    // \\ Return resolved user + company.
}

// GET /api/expenses/:id → fetch a single expense by ID.                       \\ Read a single expense row scoped to demo company.
export async function GET(
  _req: NextRequest,                                                           // \\ Request object (not used here).
  { params }: { params: Promise<{ id: string }> }                              // \\ Next.js passes params as a Promise; we must await it.
) {
  try {
    const { id } = await params;                                               // \\ Await params and extract the expense ID from the route.

    if (!id) {                                                                 // \\ Guard against missing ID in the URL.
      return NextResponse.json(
        { error: "Expense ID is required" },                                   // \\ Inform client that ID must be present.
        { status: 400 }                                                        // \\ HTTP 400 = bad request.
      );
    }

    const { company } = await getDemoAuthContext();                            // \\ Resolve demo company for scoping.

    const expense = await db.expense.findFirst({                               // \\ Look up the expense in the DB.
      where: {
        id,                                                                    // \\ Must match this specific expense ID.
        companyId: company.id,                                                 // \\ And must belong to this company (multi-tenant safety).
      },
    });

    if (!expense) {                                                            // \\ If no row matched...
      return NextResponse.json(
        { error: "Expense not found" },                                        // \\ Tell client the resource doesn't exist.
        { status: 404 }                                                        // \\ HTTP 404 = not found.
      );
    }

    return NextResponse.json(expense);                                         // \\ On success, return the expense object as JSON.
  } catch (err) {
    console.error("[EXPENSE_BY_ID_GET_ERROR]", err);                           // \\ Log unexpected errors.
    return NextResponse.json(
      { error: "Failed to fetch expense" },                                    // \\ Generic error for the client.
      { status: 500 }                                                          // \\ HTTP 500 = internal server error.
    );
  }
}

// PUT /api/expenses/:id → update an existing expense.                         \\ Update endpoint to edit a saved expense.
export async function PUT(
  req: NextRequest,                                                            // \\ Incoming request containing JSON body.
  { params }: { params: Promise<{ id: string }> }                              // \\ Route params promise providing the expense ID.
) {
  try {
    const { id } = await params;                                               // \\ Await route params to get ID.

    if (!id) {                                                                 // \\ Guard: no ID means invalid request.
      return NextResponse.json(
        { error: "Expense ID is required" },
        { status: 400 }
      );
    }

    const { company } = await getDemoAuthContext();                            // \\ Resolve demo company for scoping.

    const existing = await db.expense.findFirst({                              // \\ Fetch the existing expense row.
      where: { id, companyId: company.id },                                    // \\ Scoped by both ID and companyId.
    });

    if (!existing) {                                                           // \\ If nothing is found...
      return NextResponse.json(
        { error: "Expense not found" },                                        // \\ Return 404 to client.
        { status: 404 }
      );
    }

    const body = await req.json();                                             // \\ Parse JSON body with fields to update.

    const {
      amount,
      description,
      categoryGroup,
      categoryKey,
      isRecurring,
      label,
      recurrenceFreq,
      loadId,
      trailerId,
      truckId,
      incurredAt,
    } = body;                                                                  // \\ Destructure fields from request payload.

    let freqValue: RecurrenceFreq | null = null;                               // \\ Will hold validated enum or null.

    if (recurrenceFreq) {                                                      // \\ If client sent a recurrenceFreq...
      if (!Object.values(RecurrenceFreq).includes(recurrenceFreq)) {           // \\ Ensure it matches one of our enum values.
        return NextResponse.json(
          {
            error: `Invalid recurrenceFreq. Must be one of: ${Object.values(
              RecurrenceFreq
            ).join(", ")}`,
          },
          { status: 400 }
        );
      }
      freqValue = recurrenceFreq;                                              // \\ Valid enum; safe to use.
    }

    const updated = await db.expense.update({                                  // \\ Apply updates to the Expense row.
      where: { id },                                                           // \\ Target row by primary key ID.
      data: {
        amount:
          amount != null ? Number(amount) : existing.amount,                   // \\ Update amount if provided, otherwise keep existing.
        description: description ?? existing.description,                      // \\ Use provided description or keep existing one.
        categoryGroup: categoryGroup ?? existing.categoryGroup,                // \\ Same pattern for optional fields.
        categoryKey: categoryKey ?? existing.categoryKey,
        isRecurring:
          typeof isRecurring === "boolean"
            ? isRecurring
            : existing.isRecurring,                                            // \\ Only change isRecurring if boolean is provided.
        label: label ?? existing.label,                                        // \\ Use new label or existing.
        recurrenceFreq: freqValue ?? existing.recurrenceFreq,                  // \\ New enum value or old one.
        incurredAt: incurredAt
          ? new Date(incurredAt)
          : existing.incurredAt,                                               // \\ Parse new date if sent; otherwise keep current value.
        loadId: loadId ?? existing.loadId,                                     // \\ Maintain relationships unless explicitly changed.
        trailerId: trailerId ?? existing.trailerId,
        truckId: truckId ?? existing.truckId,
      },
    });

    return NextResponse.json(updated);                                         // \\ Return updated expense back to caller.
  } catch (err) {
    console.error("[EXPENSE_BY_ID_PUT_ERROR]", err);                           // \\ Log server-side issues.
    return NextResponse.json(
      { error: "Failed to update expense" },                                   // \\ Generic failure message.
      { status: 500 }
    );
  }
}

// DELETE /api/expenses/:id → remove an expense.                               \\ Hard delete endpoint for expenses.
export async function DELETE(
  _req: NextRequest,                                                           // \\ Request object (unused here).
  { params }: { params: Promise<{ id: string }> }                              // \\ Route params promise with expense ID.
) {
  try {
    const { id } = await params;                                               // \\ Await and extract ID.

    if (!id) {                                                                 // \\ Validate ID presence.
      return NextResponse.json(
        { error: "Expense ID is required" },
        { status: 400 }
      );
    }

    const { company } = await getDemoAuthContext();                            // \\ Resolve demo company to keep scoping consistent.

    const existing = await db.expense.findFirst({                              // \\ Ensure the expense exists and belongs to this company.
      where: { id, companyId: company.id },
    });

    if (!existing) {                                                           // \\ If not found, 404.
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    await db.expense.delete({                                                  // \\ Delete the row from Expense table.
      where: { id },                                                           // \\ Use primary key ID to delete.
    });

    return NextResponse.json({ success: true });                               // \\ Return a simple success flag.
  } catch (err) {
    console.error("[EXPENSE_BY_ID_DELETE_ERROR]", err);                        // \\ Log any unexpected server error.
    return NextResponse.json(
      { error: "Failed to delete expense" },                                   // \\ Generic error response.
      { status: 500 }
    );
  }
}
