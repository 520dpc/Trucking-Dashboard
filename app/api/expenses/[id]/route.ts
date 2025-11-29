import { NextRequest, NextResponse } from "next/server";        // Imports Next.js helpers for handling requests and responses.
import { db } from "@/lib/db";                                  // Imports the Prisma client for DB access.

// GET /api/expenses/:id → fetch a single expense by ID.
export async function GET(
  req: NextRequest,                                             // Incoming HTTP request (not used here).
  { params }: { params: Promise<{ id?: string }> }              // In your setup, `params` is a Promise, so we type it that way.
) {
  try {
    const { id } = await params;                                // Awaits the params Promise and extracts the `id` value.

    if (!id) {                                                  // Guard: without an ID, we can't fetch a specific expense.
      return NextResponse.json(
        { error: "Expense ID is required" },
        { status: 400 }
      );
    }

    const expense = await db.expense.findUnique({               // Queries the Expense table for one record.
      where: { id },                                            // Filters by the provided ID.
    });

    if (!expense) {                                             // If no record is found for that ID...
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(expense);                          // Returns the found expense as JSON.
  } catch (err) {
    console.error("[EXPENSE_GET_ERROR]", err);                  // Logs the error for backend debugging.
    return NextResponse.json(
      { error: "Failed to fetch expense" },
      { status: 500 }
    );
  }
}

// PUT /api/expenses/:id → update an existing expense.
export async function PUT(
  req: NextRequest,                                             // Incoming request containing updated expense data.
  { params }: { params: Promise<{ id?: string }> }              // Params Promise that includes the expense ID.
) {
  try {
    const { id } = await params;                                // Await params and extract the ID.

    if (!id) {                                                  // Guard: ID is required to update a specific record.
      return NextResponse.json(
        { error: "Expense ID is required" },
        { status: 400 }
      );
    }

    const data = await req.json();                              // Parses JSON body into a JS object.

    const updated = await db.expense.update({                   // Updates the expense in the database.
      where: { id },                                            // Selects which expense to update using the ID.
      data: {
        category: data.category,                                // Updated category.
        amount: Number(data.amount),                            // Updated amount, converted to number.
        description: data.description ?? null,                  // Updated description or null.
        incurredAt: data.incurredAt                             // If a new incurredAt is provided...
          ? new Date(data.incurredAt)                           // ...convert it to Date.
          : undefined,                                          // If not provided, don't change the existing value.
      },
    });

    return NextResponse.json(updated);                          // Returns the updated expense as JSON.
  } catch (err) {
    console.error("[EXPENSE_UPDATE_ERROR]", err);               // Logs any errors that occur.
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

// DELETE /api/expenses/:id → delete an expense by ID.
export async function DELETE(
  req: NextRequest,                                             // Incoming request (not used).
  { params }: { params: Promise<{ id?: string }> }              // Params Promise with the `id` we need.
) {
  try {
    const { id } = await params;                                // Await params and grab the ID.

    if (!id) {                                                  // Guard: ID is required to know what to delete.
      return NextResponse.json(
        { error: "Expense ID is required" },
        { status: 400 }
      );
    }

    await db.expense.delete({                                   // Calls Prisma to delete the matching expense row.
      where: { id },                                            // Filters by the provided ID.
    });

    return NextResponse.json({ success: true });                // Returns a simple success flag.
  } catch (err) {
    console.error("[EXPENSE_DELETE_ERROR]", err);               // Logs any errors thrown during delete.
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
