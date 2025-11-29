import { NextRequest, NextResponse } from "next/server";        // Imports Next.js helpers for handling HTTP requests and generating JSON responses.
import { db } from "@/lib/db";                                  // Imports the Prisma client instance so we can query and mutate the database.

// GET /api/expenses → list all expenses (for now, for the demo user).
export async function GET() {                                   // Defines the GET handler for the /api/expenses endpoint.
  try {                                                         // Wrap the logic in a try/catch to handle runtime errors gracefully.
    const expenses = await db.expense.findMany({                // Uses Prisma to fetch all expense records.
      orderBy: { incurredAt: "desc" },                          // Sorts expenses by date incurred, newest first.
    });

    return NextResponse.json(expenses);                         // Returns the list of expenses as a JSON response.
  } catch (err) {

    console.error("[EXPENSES_GET_ERROR]", err);                 // Logs the error to the server console for debugging.
    return NextResponse.json(                                  // Sends a structured error response back to the client.
      { error: `${db.expense}` },                    // Error message payload.
      { status: 500 }                                           // HTTP 500 = internal server error.
    );
  }
}

// POST /api/expenses → create a new expense.
export async function POST(req: NextRequest) {                  // Defines the POST handler for the /api/expenses endpoint.
  try {
    const data = await req.json();                              // Parses the JSON body from the incoming request.

    // TEMP: ensure the demo user exists until we add real authentication.
    let user = await db.user.findFirst({                        // Looks up the demo user in the database.
      where: { email: "demo@demo.com" },                        // Filters by the hard-coded demo email.
    });

    if (!user) {                                                // If the demo user does not exist yet...
      user = await db.user.create({                             // Create the demo user so expenses can reference a valid userId.
        data: {
          email: "demo@demo.com",                               // Demo user's email.
          passwordHash: "placeholder",                          // Placeholder password hash until real auth is implemented.
        },
      });
    }

    const expense = await db.expense.create({                   // Creates a new expense record using Prisma.
      data: {
        userId: user.id,                                        // Associates the expense with the demo user's ID.
        category: data.category,                                // Category string from the request body (e.g., "FUEL").
        amount: Number(data.amount),                            // Converts amount to a number to match the Int field.
        description: data.description ?? null,                  // Optional description or null if not provided.
        incurredAt: data.incurredAt                             // Optional custom date if provided...
          ? new Date(data.incurredAt)                           // ...convert it to a Date object.
          : new Date(),                                         // Otherwise, default to now.
      },
    });

    return NextResponse.json(expense, { status: 201 });         // Returns the created expense with HTTP 201 Created status.
  } catch (err) {
    console.error("[EXPENSES_POST_ERROR]", err);                // Logs any error that occurs during creation.
    return NextResponse.json(                                  // Sends an error response back to the client.
      { error: "Failed to create expense" },                    // Error payload for the client.
      { status: 500 }                                           // HTTP 500 = internal server error.
    );
  }
}
