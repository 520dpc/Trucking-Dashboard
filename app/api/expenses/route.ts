import { NextRequest, NextResponse } from "next/server";                       // \\ Next.js request/response helpers for app router API routes.
import { db } from "@/lib/db";                                                 // \\ Shared Prisma client used to talk to the database.
import { RecurrenceFreq } from "@prisma/client";                               // \\ Enum for valid recurrence frequencies as defined in Prisma schema.

// Temporary demo auth helper: reuses existing demo user + company if they exist.  \\ Ensures we don't create a new company and break scoping.
async function getDemoAuthContext() {                                          // \\ Returns { user, company } for the demo environment.
  let user = await db.user.findFirst({                                         // \\ Look for an existing demo user by email.
    where: { email: "demo@demo.com" },                                         // \\ Hard-coded demo email until real auth is wired.
    include: { company: true },                                                // \\ Also load the related company so we can reuse its ID.
  });

  if (user && user.company) {                                                  // \\ If we found a user AND it already has a company attached...
    return { user, company: user.company };                                    // \\ ...just reuse that pair; this matches any existing expenses.
  }

  let company;                                                                 // \\ We'll resolve or create a company if needed.

  if (user?.companyId) {                                                       // \\ If user exists but we didn't include company (or it's missing)...
    company =
      (await db.company.findUnique({ where: { id: user.companyId } })) ||      // \\ Try to load company by the stored companyId.
      (await db.company.create({ data: { name: "Demo Company" } }));           // \\ If not found, create a new Demo Company.
  } else {                                                                     // \\ If user has no companyId or user is null...
    company =
      (await db.company.findFirst()) ||                                        // \\ Reuse any existing company if one exists...
      (await db.company.create({ data: { name: "Demo Company" } }));           // \\ ...otherwise create a fresh Demo Company.
  }

  if (!user) {                                                                 // \\ If we still don't have a demo user...
    user = await db.user.create({                                              // \\ ...create one and attach it to the resolved company.
      data: {
        email: "demo@demo.com",                                                // \\ Demo identity email.
        passwordHash: "placeholder",                                           // \\ Placeholder until we wire proper auth.
        companyId: company.id,                                                 // \\ Attach to the company we resolved/created above.
        fullName: "Demo User",                                                 // \\ Optional friendly name.
      },
    });
  } else if (!user.companyId) {                                                // \\ If user existed but had no companyId set...
    user = await db.user.update({                                              // \\ ...patch the user to point at the resolved company.
      where: { id: user.id },                                                  // \\ Matches the existing user row.
      data: { companyId: company.id },                                         // \\ Sets companyId so future queries line up.
    });
  }

  return { user, company };                                                    // \\ Final return object used by routes.
}

// GET /api/expenses → list expenses for the demo company.                     \\ Read endpoint to show all expenses scoped to demo company.
export async function GET(_req: NextRequest) {                                 // \\ GET handler; we ignore the request body/query for now.
  try {                                                                        // \\ Wrap main logic in try/catch for safe error handling.
    const { company } = await getDemoAuthContext();                            // \\ Resolve demo company and user; we only need company here.

    const expenses = await db.expense.findMany({                               // \\ Fetch expenses from the Expense table.
      where: { companyId: company.id },                                        // \\ Scope by companyId so data is multi-tenant-safe.
      orderBy: { incurredAt: "desc" },                                         // \\ Sort newest first by when the expense occurred.
    });

    return NextResponse.json(expenses);                                        // \\ Return the list of expenses as JSON (may be empty array).
  } catch (err) {                                                              // \\ If anything blows up...
    console.error("[EXPENSES_GET_ERROR]", err);                                // \\ Log with a clear tag for debugging in server logs.
    return NextResponse.json(                                                  
      { error: "Failed to fetch expenses" },                                   // \\ Generic error object for the client.
      { status: 500 }                                                          // \\ HTTP 500 = internal server error.
    );
  }
}

// POST /api/expenses → create a new expense for the demo user/company.        \\ Write endpoint to add new expense rows.
export async function POST(req: NextRequest) {                                 // \\ POST handler; consumes JSON body.
  try {
    const { user, company } = await getDemoAuthContext();                      // \\ Ensure we have a demo user + company to link the expense to.
    const body = await req.json();                                             // \\ Parse JSON request body into a plain object.

    const {
      amount,                                                                  // \\ Required numeric amount (in cents or dollars depending on your choice).
      description,                                                             // \\ Optional free-text description of the expense.
      categoryGroup,                                                           // \\ Optional higher-level category group (e.g. "FUEL").
      categoryKey,                                                             // \\ Optional specific category key (e.g. "DIESEL").
      isRecurring,                                                             // \\ Boolean flag indicating recurring or one-off.
      label,                                                                   // \\ Optional custom label for the expense.
      recurrenceFreq,                                                          // \\ Optional recurrence frequency (WEEKLY/MONTHLY/etc.).
      loadId,                                                                  // \\ Optional link to a specific load.
      trailerId,                                                               // \\ Optional link to a trailer.
      truckId,                                                                 // \\ Optional link to a truck.
      incurredAt,                                                              // \\ Optional explicit incurred date (YYYY-MM-DD).
    } = body;                                                                  // \\ Destructure all fields from the incoming payload.

    if (amount == null || isNaN(Number(amount))) {                             // \\ Validate amount: must be present and numeric.
      return NextResponse.json(
        { error: "Amount is required and must be a number" },                  // \\ Explain why request is invalid.
        { status: 400 }                                                        // \\ HTTP 400 = bad request (client input issue).
      );
    }

    let freqValue: RecurrenceFreq | null = null;                               // \\ Will hold a properly typed enum value or null.

    if (recurrenceFreq) {                                                      // \\ If client sent a recurrenceFreq...
      if (!Object.values(RecurrenceFreq).includes(recurrenceFreq)) {           // \\ Ensure it matches one of the enum values defined in Prisma.
        return NextResponse.json(
          {
            error: `Invalid recurrenceFreq. Must be one of: ${Object.values(
              RecurrenceFreq
            ).join(", ")}`,                                                    // \\ Helpful error listing valid options.
          },
          { status: 400 }                                                      // \\ HTTP 400 = invalid client input.
        );
      }
      freqValue = recurrenceFreq;                                              // \\ Safe to assign; TS + Prisma enums align here.
    }

    const expense = await db.expense.create({                                  // \\ Insert a new row into the Expense table.
      data: {
        userId: user.id,                                                       // \\ Link to the demo user who created this expense.
        companyId: company.id,                                                 // \\ Link to the demo company for multi-tenant scoping.
        amount: Number(amount),                                                // \\ Store amount as a number (parse from string if needed).
        description: description ?? null,                                      // \\ Null if not provided for better DB hygiene.
        categoryGroup: categoryGroup ?? null,                                  // \\ Optional group.
        categoryKey: categoryKey ?? null,                                      // \\ Optional key.
        isRecurring: Boolean(isRecurring),                                     // \\ Coerce truthy/falsy to real boolean.
        label: label ?? null,                                                  // \\ Optional human-friendly label.
        recurrenceFreq: freqValue,                                             // \\ Enum value or null.
        incurredAt: incurredAt ? new Date(incurredAt) : undefined,             // \\ Use provided date or default (schema has default).
        loadId: loadId ?? null,                                                // \\ Optional relations default to null.
        trailerId: trailerId ?? null,
        truckId: truckId ?? null,
      },
    });

    return NextResponse.json(expense, { status: 201 });                        // \\ Return the created expense with HTTP 201 Created.
  } catch (err) {                                                              // \\ Catch any unexpected error.
    console.error("[EXPENSES_POST_ERROR]", err);                               // \\ Log error for debugging.
    return NextResponse.json(
      { error: "Failed to create expense" },                                   // \\ Generic message back to client.
      { status: 500 }                                                          // \\ HTTP 500 = internal server error.
    );
  }
}
