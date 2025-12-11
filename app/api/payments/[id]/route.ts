import { NextRequest, NextResponse } from "next/server";          // Next.js helpers for handling HTTP requests and responses.
import { db } from "@/lib/db";                                    // Prisma client for DB reads/writes.
import { getDemoTenant } from "@/lib/demoTenant";                 // Helper to resolve current company context (demo tenant).

/**
 * GET /api/payments/:id
 * Fetch a single payment by ID.
 */
export async function GET(
  _req: NextRequest,                                              // Incoming request (not used here, but required by signature).
  { params }: { params: Promise<{ id?: string }> }                // Dynamic route params (id) provided as a Promise.
) {
  try {
    const { company } = await getDemoTenant();                    // Resolve the current company.

    const { id } = await params;                                  // Await the params Promise and extract the payment ID.

    if (!id) {                                                    // Guard: no ID provided in the URL.
      return NextResponse.json(
        { error: "Payment ID is required" },                      // Explain the error.
        { status: 400 }                                           // HTTP 400 = bad request.
      );
    }

    const payment = await db.payment.findFirst({                  // Query the Payment table for this ID + company.
      where: {
        id,                                                       // Match the payment by primary key.
        companyId: company.id,                                    // Ensure it belongs to the current company.
      },
      include: {
        customer: true,                                           // Include linked customer for UI.
        invoice: true,                                            // Include linked invoice.
      },
    });

    if (!payment) {                                               // If no payment was found...
      return NextResponse.json(
        { error: "Payment not found" },                           // Inform the client.
        { status: 404 }                                           // HTTP 404 = not found.
      );
    }

    return NextResponse.json(payment);                            // Return the payment as JSON.
  } catch (err) {
    console.error("[PAYMENT_GET_ERROR]", err);                    // Log server error.
    return NextResponse.json(
      { error: "Failed to fetch payment" },                       // Generic error response.
      { status: 500 }                                             // HTTP 500 = internal server error.
    );
  }
}

/**
 * PUT /api/payments/:id
 * Update a payment (amount, method, receivedAt, notes).
 */
export async function PUT(
  req: NextRequest,                                               // Incoming HTTP request with JSON body of updates.
  { params }: { params: Promise<{ id?: string }> }                // Dynamic route params containing payment ID.
) {
  try {
    const { company } = await getDemoTenant();                    // Resolve the current company.

    const { id } = await params;                                  // Await params and pull out the ID.
    if (!id) {                                                    // Guard for missing ID in URL.
      return NextResponse.json(
        { error: "Payment ID is required" },                      // Error explaining what's missing.
        { status: 400 }                                           // HTTP 400 = bad request.
      );
    }

    const existing = await db.payment.findFirst({                 // Look up the existing payment in the DB.
      where: {
        id,                                                       // Match by ID.
        companyId: company.id,                                    // Ensure it belongs to this company.
      },
    });

    if (!existing) {                                              // If payment does not exist or is not owned by this company...
      return NextResponse.json(
        { error: "Payment not found" },                           // Inform the caller.
        { status: 404 }                                           // HTTP 404 = not found.
      );
    }

    const body = await req.json();                                // Parse JSON body with updates.

    const updates: any = {};                                      // Prepare a partial update object for Prisma.

    if (body.amount !== undefined) {                              // If amount is present in the body...
      const numericAmount = Number(body.amount);                  // Coerce it to a number.
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {// Validate the numeric amount.
        return NextResponse.json(
          { error: "amount must be a positive number" },          // Validation error message.
          { status: 400 }                                         // HTTP 400 = bad request.
        );
      }
      updates.amount = numericAmount;                             // Store the validated amount in the update payload.
    }

    if (body.method !== undefined) {                              // If method was provided...
      updates.method = body.method;                               // Set the new payment method (assumed valid PaymentMethod enum).
    }

    if (body.receivedAt !== undefined) {                          // If receivedAt was provided (could be null or string)...
      if (body.receivedAt === null) {                             // If explicitly null...
        updates.receivedAt = new Date();                          // ...we choose to reset to "now" (you could also disallow null).
      } else {
        const parsed = new Date(body.receivedAt);                 // Parse the provided timestamp.
        if (Number.isNaN(parsed.getTime())) {                     // Validate the parsed date.
          return NextResponse.json(
            { error: "Invalid receivedAt date" },                 // Error for invalid dates.
            { status: 400 }                                       // HTTP 400 = bad request.
          );
        }
        updates.receivedAt = parsed;                              // Save the parsed date.
      }
    }

    if (body.notes !== undefined) {                               // If notes were provided...
      updates.notes = body.notes ?? null;                         // Allow clearing notes by sending null.
    }

    // Optionally allow changing invoice/customer if you want; for now we lock them.
    // If you want to support reassigning a payment, we’d add validation here.

    const updated = await db.payment.update({                     // Perform the actual update in the DB.
      where: { id },                                              // Target the payment by primary key.
      data: updates,                                              // Apply only the fields we collected above.
      include: {
        customer: true,                                           // Include related customer in response.
        invoice: true,                                            // Include related invoice in response.
      },
    });

    return NextResponse.json(updated);                            // Return the updated payment as JSON.
  } catch (err) {
    console.error("[PAYMENT_PUT_ERROR]", err);                    // Log the error for debugging.
    return NextResponse.json(
      { error: "Failed to update payment" },                      // Generic error message for clients.
      { status: 500 }                                             // HTTP 500 = internal server error.
    );
  }
}

/**
 * DELETE /api/payments/:id
 * Hard delete a payment.
 * (If you later want soft-delete, we can add a deletedAt field instead.)
 */
export async function DELETE(
  _req: NextRequest,                                              // Incoming request (unused).
  { params }: { params: Promise<{ id?: string }> }                // Route params containing the payment ID.
) {
  try {
    const { company } = await getDemoTenant();                    // Resolve current company.

    const { id } = await params;                                  // Await params and get the ID.
    if (!id) {                                                    // Guard: ID is required.
      return NextResponse.json(
        { error: "Payment ID is required" },                      // Explain missing ID.
        { status: 400 }                                           // HTTP 400 = bad request.
      );
    }

    const existing = await db.payment.findFirst({                 // Verify the payment exists and belongs to the company.
      where: {
        id,                                                       // Match ID.
        companyId: company.id,                                    // Match company.
      },
    });

    if (!existing) {                                              // If not found...
      return NextResponse.json(
        { error: "Payment not found" },                           // Inform client.
        { status: 404 }                                           // HTTP 404 = not found.
      );
    }

    await db.payment.delete({                                     // Delete the payment row from the DB.
      where: { id },                                              // Target by primary key.
    });

    return NextResponse.json({ success: true });                  // Return a simple success payload.
  } catch (err) {
    console.error("[PAYMENT_DELETE_ERROR]", err);                 // Log deletion error for debugging.
    return NextResponse.json(
      { error: "Failed to delete payment" },                      // Generic error message.
      { status: 500 }                                             // HTTP 500 = internal server error.
    );
  }
}
