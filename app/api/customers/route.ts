import { NextRequest, NextResponse } from "next/server";                     // Provides Next.js types and helpers for building route handlers.
import { db } from "@/lib/db";                                               // Imports the shared Prisma client instance to talk to the database.
import { getDemoTenant } from "@/lib/demoTenant";                            // Helper that ensures a demo Company + User exist and returns them.

/**
 * GET /api/customers
 * Returns all non-deleted customers for the current company.
 */
export async function GET() {                                                // Defines the GET handler for the /api/customers endpoint.
  try {                                                                      // Wraps logic in try/catch so we can handle errors cleanly.
    const { company } = await getDemoTenant();                               // Ensures we have a demo Company and retrieves it for scoping queries.

    const customers = await db.customer.findMany({                           // Queries the Customer table for all customers belonging to this company.
      where: {
        companyId: company.id,                                               // Only return customers for this specific company (multi-tenant isolation).
        deletedAt: null,                                                     // Exclude customers that have been soft-deleted.
      },
      orderBy: {
        createdAt: "desc",                                                   // Sorts customers by newest first; easier to see recent adds.
      },
      include: {
        callNotes: true,                                                     // Includes related CallNote records so UI can show last contact, etc.
        loads: true,                                                         // Includes related Load records so we can compute performance later.
        contacts: true,                                                      // ⬅ NEW: include related Contact records attached to each customer.
      },
    });

    return NextResponse.json(customers);                                     // Returns the array of customers as JSON with HTTP 200 OK.
  } catch (err) {                                                            // If any error occurs during DB access...
    console.error("[CUSTOMERS_GET_ERROR]", err);                             // Logs the error in the server console with a clear tag for debugging.
    return NextResponse.json(                                                // Responds to the client with a generic error message.
      { error: "Failed to fetch customers" },                                // JSON payload indicating the failure.
      { status: 500 }                                                        // HTTP 500 = internal server error.
    );
  }
}

export async function POST(req: NextRequest) {                               // Defines the POST handler for /api/customers.
  try {
    const body = await req.json();                                           // Parses the JSON request body into a plain JS object.
    const { company, user } = await getDemoTenant();                         // Ensures we have a demo Company + User and retrieves them.

    const rawName = String(body.name ?? "").trim();                          // Safely reads the name field and trims whitespace.
    if (!rawName) {                                                          // If name is missing or empty after trimming...
      return NextResponse.json(                                              // ...respond with 400 Bad Request.
        { error: "Customer name is required" },                              // JSON payload explaining that name is required.
        { status: 400 }                                                      // HTTP 400 status code.
      );
    }

    const status = (body.status as string | undefined) ?? "PROSPECT";        // Uses provided status, or defaults to PROSPECT if absent.
    const normalizedStatus = status.toUpperCase() as                         // Normalizes to uppercase to match the enum in Prisma.
      | "PROSPECT"
      | "ACTIVE"
      | "DORMANT";                                                            // Narrows type to known CustomerStatus enum values.

    const convertedAt =
      normalizedStatus === "ACTIVE"                                          // If this customer is being created directly as ACTIVE...
        ? new Date()                                                         // ...set convertedAt to now so we know when they became a customer.
        : null;                                                              // Otherwise, keep convertedAt null (still a prospect or dormant).

    const customer = await db.customer.create({                              // Creates a new Customer row in the database.
      data: {
        companyId: company.id,                                               // Associates customer with the current company (multi-tenant).
        userId: user.id,                                                     // Associates customer with the user who created it.
        name: rawName,                                                       // Required name for the customer/prospect.

        // BASIC PROFILE
        type: body.type ?? null,                                             // Optional type label (e.g., "BROKER", "SHIPPER").
        mcNumber: body.mcNumber ?? null,                                     // Optional MC number.
        email: body.email ?? null,                                           // Optional primary email.
        phone: body.phone ?? null,                                           // Optional primary phone.
        notes: body.notes ?? null,                                           // Optional free-form notes (general).
        companyNotes: body.companyNotes ?? null,                             // Optional company-level notes (credit, billing info, etc.).

        // ADDRESS INFO
        addressLine1: body.addressLine1 ?? null,                             // Optional address line 1.
        addressLine2: body.addressLine2 ?? null,                             // Optional address line 2.
        city: body.city ?? null,                                             // Optional city.
        state: body.state ?? null,                                           // Optional state.
        postalCode: body.postalCode ?? null,                                 // Optional postal/ZIP code.
        country: body.country ?? "US",                                       // Optional country, defaulting to US.

        // CREDIT / TERMS
        daysToPay:
          body.daysToPay !== undefined                                       // If daysToPay provided...
            ? Number(body.daysToPay)                                         // ...cast to number.
            : null,                                                          // Otherwise, leave as null.
        billingEmail: body.billingEmail ?? null,                             // Optional AP/billing email.
        creditHold: Boolean(body.creditHold ?? false),                       // Whether this customer is on credit hold.
        creditLimit:
          body.creditLimit !== undefined                                     // If creditLimit provided...
            ? Number(body.creditLimit)                                       // ...cast to number.
            : null,                                                          // Otherwise, leave as null.
        portalUrl: body.portalUrl ?? null,                                   // Optional external portal URL for this customer.

        // SALES / PIPELINE
        leadStatus: body.leadStatus ?? null,                                 // Optional LeadStatus enum ("HOT", "WARM", etc.).
        status: normalizedStatus,                                            // CustomerStatus enum: PROSPECT | ACTIVE | DORMANT.
        convertedAt,                                                         // When they became ACTIVE (if applicable); otherwise null.

        // LIFECYCLE
        dormantAt: null,                                                     // DormantAt starts as null; will be set by future dormant logic.
        deletedAt: null,                                                     // Not deleted when created.
      },
    });

    return NextResponse.json(customer, { status: 201 });                     // Returns the created customer as JSON with HTTP 201 Created.
  } catch (err) {
    console.error("[CUSTOMERS_POST_ERROR]", err);                            // Logs any error to the server console for debugging.
    return NextResponse.json(                                                // Responds to the client with a generic error.
      { error: "Failed to create customer" },                                // JSON message indicating failure.
      { status: 500 }                                                        // HTTP 500 internal server error.
    );
  }
}
