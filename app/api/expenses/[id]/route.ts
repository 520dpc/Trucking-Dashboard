import { NextRequest, NextResponse } from "next/server";                    // Next.js helper types for handling requests/responses.
import { db } from "@/lib/db";                                              // Prisma client for database access.
import { getDemoTenant } from "@/lib/demoTenant";                           // Demo tenant helper that provides the current company + user for now.

/**
 * GET /api/expenses/:id
 * Fetch a single expense by ID, scoped to the current company.
 */
export async function GET(
  _req: NextRequest,                                                        // Incoming request; unused here.
  context: { params: Promise<{ id?: string }> }                             // Dynamic route params wrapped in a Promise (App Router behavior).
) {
  try {
    const { company } = await getDemoTenant();                              // Resolve company context to enforce multi-tenancy.

    const { id } = await context.params;                                    // Await the params Promise and destructure `id`.
    if (!id) {                                                              // Guard: if no ID was provided in the URL...
      return NextResponse.json(
        { error: "Expense ID is required" },                                // Inform the client they must pass an ID.
        { status: 400 }                                                     // HTTP 400 = bad request.
      );
    }

    const expense = await db.expense.findFirst({                            // Look up a single expense row.
      where: {
        id,                                                                 // Match the specific expense ID.
        companyId: company.id,                                              // Ensure it belongs to this company.
      },
    });

    if (!expense) {                                                         // If no matching expense exists...
      return NextResponse.json(
        { error: "Expense not found" },                                     // Inform the client that the resource does not exist.
        { status: 404 }                                                     // HTTP 404 = not found.
      );
    }

    return NextResponse.json(expense);                                      // Return the expense as JSON with 200 OK.
  } catch (err) {
    console.error("[EXPENSE_GET_ERROR]", err);                              // Log any unexpected error for debugging.
    return NextResponse.json(
      { error: "Failed to fetch expense" },                                 // Generic error message for the client.
      { status: 500 }                                                       // HTTP 500 = server error.
    );
  }
}

/**
 * PUT /api/expenses/:id
 * Update an existing expense. Supports partial updates.
 */
export async function PUT(
  req: NextRequest,                                                         // Incoming request containing JSON with updated fields.
  context: { params: Promise<{ id?: string }> }                             // Dynamic route params with `id`.
) {
  try {
    const body = await req.json();                                          // Parse the JSON body into a plain object.
    const { company } = await getDemoTenant();                              // Resolve company context.

    const { id } = await context.params;                                    // Await params and grab the `id`.
    if (!id) {                                                              // Guard: cannot update without an ID.
      return NextResponse.json(
        { error: "Expense ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.expense.findFirst({                           // Fetch the existing expense so we can merge updates safely.
      where: {
        id,                                                                 // Must match this expense.
        companyId: company.id,                                              // Must belong to this company.
      },
    });

    if (!existing) {                                                        // If there is no such expense...
      return NextResponse.json(
        { error: "Expense not found" },                                     // Tell the client it doesn’t exist.
        { status: 404 }
      );
    }

    // Normalize/validate fields.
    let nextAmount = existing.amount;                                       // Start with existing amount.
    if (body.amount !== undefined) {                                        // If amount is provided in the payload...
      const amountNumber = Number(body.amount);                             // Coerce to number.
      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {            // Guard invalid or non-positive values.
        return NextResponse.json(
          { error: "Amount must be a positive number" },
          { status: 400 }
        );
      }
      nextAmount = Math.round(amountNumber);                                // Save the validated amount as an integer.
    }

    let nextIncurredAt = existing.incurredAt;                               // Start with existing incurred date.
    if (body.incurredAt !== undefined) {                                    // If client wants to change it...
      const candidate = new Date(body.incurredAt);                          // Parse the provided date string.
      if (Number.isNaN(candidate.getTime())) {                              // Validate that it’s a real date.
        return NextResponse.json(
          { error: "Invalid incurredAt date" },
          { status: 400 }
        );
      }
      nextIncurredAt = candidate;                                           // Accept the new incurred date.
    }

    const isRecurring =
      body.isRecurring !== undefined                                        // If isRecurring provided, use that; otherwise keep existing.
        ? Boolean(body.isRecurring)
        : existing.isRecurring;

    const recurrenceFreq =
      body.recurrenceFreq !== undefined                                     // If recurrenceFreq provided, use that (or null).
        ? body.recurrenceFreq ?? null
        : existing.recurrenceFreq;

    if (isRecurring && !recurrenceFreq) {                                   // Enforce recurring rule on update as well.
      return NextResponse.json(
        { error: "recurrenceFreq is required when isRecurring is true" },
        { status: 400 }
      );
    }

    const updated = await db.expense.update({                               // Commit the updates to the database.
      where: { id },                                                        // Target the specific expense by its ID.
      data: {
        amount: nextAmount,                                                 // Persist the normalized amount.
        incurredAt: nextIncurredAt,                                         // Persist the normalized incurredAt date.

        description:
          body.description !== undefined                                    // Update description if provided.
            ? body.description ?? null
            : existing.description,

        categoryGroup:
          body.categoryGroup !== undefined                                  // Update categoryGroup if provided.
            ? body.categoryGroup ?? null
            : existing.categoryGroup,

        categoryKey:
          body.categoryKey !== undefined                                    // Update categoryKey if provided.
            ? body.categoryKey ?? null
            : existing.categoryKey,

        label:
          body.label !== undefined                                          // Update label if provided.
            ? body.label ?? null
            : existing.label,

        isRecurring,                                                        // Persist normalized isRecurring.
        recurrenceFreq,                                                     // Persist normalized recurrenceFreq.

        loadId:
          body.loadId !== undefined                                         // Update loadId if explicitly provided.
            ? body.loadId ?? null
            : existing.loadId,

        truckId:
          body.truckId !== undefined                                        // Update truckId if explicitly provided.
            ? body.truckId ?? null
            : existing.truckId,

        trailerId:
          body.trailerId !== undefined                                      // Update trailerId if explicitly provided.
            ? body.trailerId ?? null
            : existing.trailerId,
      },
    });

    return NextResponse.json(updated);                                      // Return the updated expense object to the client.
  } catch (err) {
    console.error("[EXPENSE_UPDATE_ERROR]", err);                           // Log the error for debugging.
    return NextResponse.json(
      { error: "Failed to update expense" },                                // Generic failure message.
      { status: 500 }                                                       // HTTP 500 = server-side error.
    );
  }
}

/**
 * DELETE /api/expenses/:id
 * Permanently deletes an expense for the current company.
 */
export async function DELETE(
  _req: NextRequest,                                                        // Incoming request; unused.
  context: { params: Promise<{ id?: string }> }                             // Dynamic params with `id`.
) {
  try {
    const { company } = await getDemoTenant();                              // Resolve company context.

    const { id } = await context.params;                                    // Await params and extract `id`.
    if (!id) {                                                              // Guard: cannot delete without ID.
      return NextResponse.json(
        { error: "Expense ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.expense.findFirst({                           // Ensure the expense exists and belongs to this company.
      where: {
        id,
        companyId: company.id,
      },
    });

    if (!existing) {                                                        // If no matching expense...
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    await db.expense.delete({                                               // Delete the expense row from the database.
      where: { id },                                                        // Target by primary key.
    });

    return NextResponse.json({ success: true });                            // Respond with a simple success flag.
  } catch (err) {
    console.error("[EXPENSE_DELETE_ERROR]", err);                           // Log the error for server-side debugging.
    return NextResponse.json(
      { error: "Failed to delete expense" },                                // Generic error payload.
      { status: 500 }                                                       // HTTP 500 = internal server error.
    );
  }
}
