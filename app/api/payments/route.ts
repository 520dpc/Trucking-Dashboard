import { NextRequest, NextResponse } from "next/server";          // Provides types/utilities for handling requests and building JSON responses in Next.js routes.
import { db } from "@/lib/db";                                    // Prisma client instance so we can query and write to the PostgreSQL database.
import { getDemoTenant } from "@/lib/demoTenant";                 // Helper to resolve the current demo company + user (until real auth is wired in).

/**
 * GET /api/payments
 * Optional query params:
 *   - customerId=<uuid>
 *   - invoiceId=<uuid>
 */
export async function GET(req: NextRequest) {                     // Handles GET requests to /api/payments.
  try {                                                           // Wrap the logic in try/catch so an error doesn't crash the route.
    const { company } = await getDemoTenant();                    // Resolves the current company context (multi-tenant safety).

    const { searchParams } = new URL(req.url);                    // Parses the incoming URL so we can read query parameters.
    const customerId = searchParams.get("customerId");            // Reads optional ?customerId=... for filtering.
    const invoiceId = searchParams.get("invoiceId");              // Reads optional ?invoiceId=... for filtering.

    const where: any = {                                          // Start building a dynamic Prisma filter object.
      companyId: company.id,                                      // Always restrict payments to the current company.
    };                                                            // End of initial filter object.

    if (customerId) {                                             // If the client provided a customerId filter...
      where.customerId = customerId;                              // ...only return payments for that customer.
    }                                                             // End customerId filter block.

    if (invoiceId) {                                              // If the client provided an invoiceId filter...
      where.invoiceId = invoiceId;                                // ...only return payments tied to that invoice.
    }                                                             // End invoiceId filter block.

    const payments = await db.payment.findMany({                  // Query the Payment table via Prisma.
      where,                                                      // Apply our assembled filter (company + optional customer/invoice).
      orderBy: { receivedAt: "desc" },                            // Sort most recent payments first for better UX.
      include: {                                                  // Eager-load related entities used in the UI.
        customer: true,                                           // Include the Customer this payment belongs to.
        invoice: true,                                            // Include the Invoice this payment is applied to.
      },                                                          // End include block.
    });                                                           // End Prisma query.

    return NextResponse.json(payments);                           // Return the list of payments as JSON (200 OK).
  } catch (err) {
    console.error("[PAYMENTS_GET_ERROR]", err);                   // Log server-side error for debugging.
    return NextResponse.json(                                    // Send a structured error response.
      { error: "Failed to fetch payments" },                      // Error message the frontend can show.
      { status: 500 }                                             // HTTP 500 = internal server error.
    );                                                            // End error response.
  }
}

/**
 * POST /api/payments
 *
 * Expected body shape (example):
 * {
 *   "customerId": "uuid-of-customer",
 *   "invoiceId": "uuid-of-invoice",
 *   "amount": 1950,
 *   "method": "ACH",                    // Optional, defaults to ACH
 *   "receivedAt": "2025-12-10T15:00:00.000Z", // Optional, defaults to now
 *   "notes": "Paid via bank transfer"
 * }
 */
export async function POST(req: NextRequest) {                    // Handles POST requests to /api/payments.
  try {
    const { company } = await getDemoTenant();                    // Get the current company context.

    const body = await req.json();                                // Parse incoming JSON request body.

    const {                                                       
      customerId,                                                 // ID of the customer paying the invoice.
      invoiceId,                                                  // ID of the invoice this payment is for.
      amount,                                                     // Amount of the payment (Int; cents or dollars per your convention).
      method,                                                     // Optional payment method string (ACH, CHECK, FACTORING, etc.).
      receivedAt,                                                 // Optional receivedAt date string.
      notes,                                                      // Optional notes string.
    } = body;                                                     // Destructure body into individual variables.

    if (!customerId || !invoiceId || amount === undefined) {      // Validate required fields exist.
      return NextResponse.json(                                  // If something is missing, return a 400 response.
        { error: "customerId, invoiceId, and amount are required" }, // Tell the client exactly what is required.
        { status: 400 }                                           // HTTP 400 = bad request.
      );
    }

    const numericAmount = Number(amount);                         // Coerce amount into a number to satisfy Prisma's Int field.
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {  // Ensure the amount is a valid positive number.
      return NextResponse.json(
        { error: "amount must be a positive number" },            // Validation error message.
        { status: 400 }                                           // HTTP 400 = bad request.
      );
    }

    // Verify that the invoice exists and belongs to this company.
    const invoice = await db.invoice.findFirst({                  // Look up the invoice in the DB.
      where: {
        id: invoiceId,                                            // Match the invoiceId from the request.
        companyId: company.id,                                    // Ensure it belongs to the current company.
      },
      include: {
        customer: true,                                           // Also include the customer to cross-check consistency.
      },
    });

    if (!invoice) {                                               // If invoice not found or not in this company...
      return NextResponse.json(
        { error: "Invoice not found for this company" },          // Tell the client the invoice is invalid in this context.
        { status: 404 }                                           // HTTP 404 = not found.
      );
    }

    if (invoice.customerId !== customerId) {                      // If the payment's customerId doesn't match the invoice's customer...
      return NextResponse.json(
        { error: "Payment customerId does not match invoice customer" }, // Prevent mismatched payment application.
        { status: 400 }                                           // HTTP 400 = bad request.
      );
    }

    let receivedDate: Date;                                       // Will hold the final receivedAt value.
    if (receivedAt) {                                             // If client passed a receivedAt timestamp...
      const parsed = new Date(receivedAt);                        // Try to parse it into a Date.
      if (Number.isNaN(parsed.getTime())) {                       // If it doesn't parse correctly...
        return NextResponse.json(
          { error: "Invalid receivedAt date" },                   // Return a validation error.
          { status: 400 }                                         // HTTP 400 = bad request.
        );
      }
      receivedDate = parsed;                                      // Use the parsed date as the receivedAt value.
    } else {
      receivedDate = new Date();                                  // If not provided, default to "now".
    }

    // Create the payment record.
    const payment = await db.payment.create({                     // Insert a new Payment row in the DB.
      data: {
        companyId: company.id,                                    // Associate payment to the current company.
        customerId,                                               // Link to the paying customer.
        invoiceId,                                                // Link to the invoice being paid.
        amount: numericAmount,                                    // Store the normalized numeric amount.
        method: method ?? "ACH",                                  // Default payment method to ACH if none provided.
        receivedAt: receivedDate,                                 // Store the parsed or default receivedAt date.
        notes: notes ?? null,                                     // Store optional notes (or null).
      },
      include: {
        customer: true,                                           // Include customer in the response for UI convenience.
        invoice: true,                                            // Include invoice in the response.
      },
    });

    // (Optional future step: recompute invoice status based on total payments vs total.)
    // For now, we just create the payment and leave invoice status unchanged.

    return NextResponse.json(payment, { status: 201 });           // Return the created payment with 201 Created status.
  } catch (err) {
    console.error("[PAYMENTS_POST_ERROR]", err);                  // Log server-side errors to help debugging.
    return NextResponse.json(
      { error: "Failed to create payment" },                      // Generic error message for clients.
      { status: 500 }                                             // HTTP 500 = internal server error.
    );
  }
}
