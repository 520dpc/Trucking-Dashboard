import { NextRequest, NextResponse } from "next/server"; // Imports Next.js helpers for handling HTTP requests and JSON responses.
import { db } from "@/lib/db";                            // Imports the Prisma client so we can talk to the PostgreSQL database.
import { getDemoTenant } from "@/lib/demoTenant";         // Imports helper that returns the demo company + user context.
import type { InvoiceStatus } from "@prisma/client";      // Imports the InvoiceStatus enum type so we can validate status safely.

// Allowed invoice statuses based on your schema enum.
const ALLOWED_STATUSES: InvoiceStatus[] = [              // Defines a whitelist of valid InvoiceStatus values.
  "DRAFT",                                               // Invoice created but not yet sent.
  "SENT",                                                // Invoice sent to the customer.
  "OVERDUE",                                             // Invoice past due date and not fully paid.
  "PAID",                                                // Invoice fully paid.
  "CANCELLED",                                           // Invoice cancelled.
];                                                       // Ends the array of allowed statuses.

/**
 * GET /api/invoices
 * Optional query params:
 *   - status=SENT|DRAFT|PAID|OVERDUE|CANCELLED
 *   - customerId=<uuid>
 */
export async function GET(req: NextRequest) {            // Defines the GET handler for /api/invoices.
  try {                                                  // Wraps in try/catch to handle errors gracefully.
    const { company } = await getDemoTenant();           // Resolves the current company from the demo tenant helper.

    const { searchParams } = new URL(req.url);           // Parses the incoming URL so we can read query parameters.
    const statusParam = searchParams.get("status");      // Reads optional ?status=... filter.
    const customerId = searchParams.get("customerId");   // Reads optional ?customerId=... filter.

    const where: any = {                                 // Builds a dynamic Prisma filter object.
      companyId: company.id,                             // Always restrict invoices to the current company (multi-tenant safe).
    };                                                   // Ends the base filter.

    if (statusParam && ALLOWED_STATUSES.includes(statusParam as InvoiceStatus)) {
      where.status = statusParam;                        // If a valid status is provided, filter invoices by that status.
    }                                                    // Ends the status filter block.

    if (customerId) {                                    // If a customerId query param is provided...
      where.customerId = customerId;                     // ...filter invoices to only that customer.
    }                                                    // Ends the customerId filter block.

    const invoices = await db.invoice.findMany({         // Queries the Invoice table via Prisma.
      where,                                             // Applies the assembled filter (company + optional status/customer).
      orderBy: { issueDate: "desc" },                    // Orders invoices by newest issue date first.
      include: {                                         // Eager-loads related data needed for the UI.
        customer: true,                                  // Includes the Customer record.
        lines: true,                                     // Includes InvoiceLine records.
        loadLinks: {                                     // Includes InvoiceLoad join records.
          include: {                                     // For each join record...
            load: true,                                  // ...also include the Load itself.
          },
        },
        payments: true,                                  // Includes Payment records associated with this invoice.
      },
    });                                                  // Ends the Prisma query.

    return NextResponse.json(invoices);                  // Returns the list of invoices as JSON with 200 OK.
  } catch (err) {
    console.error("[INVOICES_GET_ERROR]", err);          // Logs any server-side error for debugging.
    return NextResponse.json(                           // Returns a generic error payload to the client.
      { error: "Failed to fetch invoices" },             // Error message shown in the frontend.
      { status: 500 }                                    // HTTP 500 = internal server error.
    );                                                   // Ends the error response.
  }
}

/**
 * POST /api/invoices
 *
 * Expected body shape (example):
 *
 * {
 *   "customerId": "uuid-of-customer",
 *   "invoiceNumber": "INV-1001",
 *   "issueDate": "2025-12-10",
 *   "dueDate": "2025-12-25",
 *   "status": "SENT",                 // optional, defaults to DRAFT
 *   "isFactored": true,
 *   "factoringFee": 150,              // cents or dollars depending on your convention (we’re using Int)
 *   "notes": "Net 15 terms.",
 *   "lines": [
 *     { "description": "Linehaul", "quantity": 1, "unitAmount": 2000 },
 *     { "description": "Fuel surcharge", "quantity": 1, "unitAmount": 150 }
 *   ],
 *   "loadIds": ["uuid-of-load-1", "uuid-of-load-2"]
 * }
 */
export async function POST(req: NextRequest) {           // Defines the POST handler for /api/invoices.
  try {                                                  // Wrap logic in try/catch for safe error handling.
    const { company } = await getDemoTenant();           // Resolves the current company (and demo user, if needed).
    const body = await req.json();                       // Parses the JSON body from the incoming request.

    const {
      customerId,                                        // ID of the customer being invoiced.
      invoiceNumber,                                     // External invoice number string (required for accounting).
      issueDate,                                         // Date the invoice was issued (string).
      dueDate,                                           // Optional due date string.
      status: rawStatus,                                 // Optional status string; we normalize it below.
      isFactored,                                        // Boolean indicating if this invoice is factored.
      factoringFee,                                      // Optional factoring fee amount (integer).
      notes,                                             // Optional free-text notes.
      lines,                                             // Array of line items.
      loadIds,                                           // Array of load IDs to link to this invoice.
    } = body;                                            // Destructures the body into local variables.

    if (!customerId || !invoiceNumber || !issueDate) {   // Basic validation for required fields.
      return NextResponse.json(                         // If something essential is missing...
        { error: "customerId, invoiceNumber, and issueDate are required" }, // Tell the client what is missing.
        { status: 400 }                                  // HTTP 400 = bad request.
      );
    }

    const statusUpper = (rawStatus as string | undefined)?.toUpperCase(); // Normalizes incoming status to uppercase.
    const status: InvoiceStatus =                         // Determines the final status to use.
      statusUpper && ALLOWED_STATUSES.includes(statusUpper as InvoiceStatus) // If status is valid...
        ? (statusUpper as InvoiceStatus)                  // ...use it.
        : "DRAFT";                                        // Otherwise default to DRAFT.

    const issue = new Date(issueDate);                    // Parses issueDate into a real Date object.
    if (Number.isNaN(issue.getTime())) {                  // Validates that issueDate is a valid date.
      return NextResponse.json(
        { error: "Invalid issueDate" },                   // Respond if the date cannot be parsed.
        { status: 400 }                                   // HTTP 400 = bad request.
      );
    }

    const due = dueDate ? new Date(dueDate) : null;       // Parses dueDate if provided, otherwise null.
    if (dueDate && Number.isNaN(due!.getTime())) {        // If a dueDate string was provided but invalid...
      return NextResponse.json(
        { error: "Invalid dueDate" },                     // Return a validation error to the client.
        { status: 400 }                                   // HTTP 400 = bad request.
      );
    }

    const lineItems = Array.isArray(lines) ? lines : [];  // Ensures we always have an array for line items.
    if (lineItems.length === 0) {                         // Require at least one line item for the invoice.
      return NextResponse.json(
        { error: "At least one invoice line is required" }, // Explain that we need at least one line.
        { status: 400 }                                   // HTTP 400 = bad request.
      );
    }

    // Compute subtotal from the line items: sum(quantity * unitAmount).
    const subtotal = lineItems.reduce(                    // Uses reduce to accumulate the total across all lines.
      (acc, line) => {
        const qty = Number(line.quantity ?? 1);           // Coerces quantity to a number, defaulting to 1.
        const unit = Number(line.unitAmount ?? 0);        // Coerces unitAmount to a number, defaulting to 0.
        return acc + qty * unit;                          // Adds quantity * unitAmount to the running total.
      },
      0                                                   // Starts accumulation at 0.
    );

    const factoringFeeValue =                            // Normalizes factoringFee to a number or null.
      factoringFee !== undefined && factoringFee !== null // If caller provided a factoringFee...
        ? Number(factoringFee)                            // ...cast it to a number.
        : null;                                           // Otherwise treat it as null.

    const total =                                        // Computes total invoice amount.
      factoringFeeValue !== null                          // If we have a factoring fee...
        ? subtotal - factoringFeeValue                    // ...subtract it from subtotal.
        : subtotal;                                       // Otherwise total == subtotal.

    const loadIdArray: string[] = Array.isArray(loadIds) // Normalizes loadIds into a string array.
      ? loadIds.filter((id: unknown) => typeof id === "string") // Keep only string IDs.
      : [];                                              // If not an array, treat as empty.

    // Optional: sanity check loads belong to this company.
    if (loadIdArray.length > 0) {                        // Only query if we actually have load IDs.
      const loads = await db.load.findMany({             // Fetches loads by IDs.
        where: {
          id: { in: loadIdArray },                       // Only loads whose ID is in the given list.
          companyId: company.id,                         // And must belong to the current company.
        },
        select: { id: true },                            // Only select the ID field.
      });

      const foundIds = new Set(loads.map((l) => l.id));  // Collects the IDs of loads actually found.
      const missing = loadIdArray.filter((id) => !foundIds.has(id)); // Any requested IDs that were not found.

      if (missing.length > 0) {                          // If there are invalid load IDs...
        return NextResponse.json(
          { error: `Some loads not found or not in this company: ${missing.join(", ")}` }, // Return an error listing them.
          { status: 400 }                               // HTTP 400 = bad request.
        );
      }
    }

    // Create the invoice, its lines, and its load links in one go using Prisma nested writes.
    const invoice = await db.invoice.create({            // Creates a new Invoice record in the database.
      data: {
        companyId: company.id,                           // Associates the invoice with the current company.
        customerId,                                      // Sets which customer is being invoiced.
        invoiceNumber,                                   // Sets the invoice number string.
        externalInvoiceNumber: null,                     // Placeholder: can be used for factoring system references later.
        issueDate: issue,                                // Stores the parsed issue date.
        dueDate: due,                                    // Stores the parsed due date or null.
        subtotal,                                        // Stores computed subtotal.
        factoringFee: factoringFeeValue,                 // Stores factoring fee or null.
        total,                                           // Stores computed total.
        status,                                          // Stores normalized InvoiceStatus.
        isFactored: Boolean(isFactored),                 // Stores whether this invoice is factored.
        notes: notes ?? null,                            // Stores optional notes or null.

        lines: {                                         // Nested write for InvoiceLine records.
          create: lineItems.map((line: any) => ({        // Maps each input line into a create object.
            description: String(line.description ?? ""), // Description of the line item (forced to string).
            quantity: Number(line.quantity ?? 1),        // Quantity with default of 1.
            unitAmount: Number(line.unitAmount ?? 0),    // Unit amount with default of 0.
            total: Number(line.quantity ?? 1) * Number(line.unitAmount ?? 0), // Computes total for this line.
          })),
        },

        loadLinks: {                                     // Nested write for InvoiceLoad join records.
          create: loadIdArray.map((loadId) => ({         // Creates one join record per loadId.
            loadId,                                      // The ID of the load being linked.
          })),
        },
      },
      include: {                                         // Include related records in the response.
        customer: true,                                  // Include Customer.
        lines: true,                                     // Include InvoiceLine[].
        loadLinks: {                                     // Include InvoiceLoad[] with Load.
          include: { load: true },                       // Also include the Load for each link.
        },
        payments: true,                                  // Include any Payment records (likely empty on creation).
      },
    });

    return NextResponse.json(invoice, { status: 201 });  // Returns the created invoice as JSON with 201 Created.
  } catch (err) {
    console.error("[INVOICES_POST_ERROR]", err);          // Logs unexpected errors to the server console.
    return NextResponse.json(                           // Returns a generic error response to the client.
      { error: "Failed to create invoice" },             // Payload with a simple error message.
      { status: 500 }                                    // HTTP 500 = internal server error.
    );
  }
}
