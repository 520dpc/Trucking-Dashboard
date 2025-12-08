import { NextRequest, NextResponse } from "next/server";               // Provides types and helpers for handling HTTP requests/responses in Next.js route handlers.
import { db } from "@/lib/db";                                         // Prisma client instance used to communicate with the database.
import { getDemoTenant } from "@/lib/demoTenant";                      // Helper that returns (or creates) the demo Company + User (for now, until real auth is wired).

/**
 * GET /api/customers/:customerId
 * Fetch a single customer, including call notes, loads, and contacts.
 */
export async function GET(
  _req: NextRequest,                                                   // Incoming HTTP request (unused here).
  context: { params: Promise<{ customerId?: string }> }                // Dynamic route params come in as a Promise in the app router.
) {
  try {
    const { company } = await getDemoTenant();                         // Retrieve the demo company; all queries are scoped to this company.

    const { customerId } = await context.params;                       // Await params and destructure `customerId` (matches folder name [customerId]).

    if (!customerId) {                                                 // Guard: if there is no customerId in the URL...
      return NextResponse.json(
        { error: "Customer ID is required" },                          // ...respond with a clear error message.
        { status: 400 }                                                // HTTP 400 = client input error.
      );
    }

    const customer = await db.customer.findFirst({                     // Look up a single customer row.
      where: {
        id: customerId,                                                // Must match this specific customer ID.
        companyId: company.id,                                         // Must belong to the current company.
        deletedAt: null,                                               // Exclude soft-deleted customers.
      },
      include: {
        callNotes: {
          orderBy: { createdAt: "desc" },                              // Sort notes newest first.
          take: 20,                                                    // Limit to most recent 20 notes.
          include: { user: true },                                     // Include the user who wrote each note.
        },
        loads: true,                                                   // Include loads for this customer (for performance stats later).
        contacts: true,                                                // Include related contacts.
      },
    });

    if (!customer) {                                                   // If no customer is found...
      return NextResponse.json(
        { error: "Customer not found" },                               // ...tell the client the resource doesn’t exist.
        { status: 404 }                                                // HTTP 404 = not found.
      );
    }

    return NextResponse.json(customer);                                // Return the full customer object as JSON.
  } catch (err) {
    console.error("[CUSTOMER_GET_ERROR]", err);                        // Log the error on the server for debugging.
    return NextResponse.json(
      { error: "Failed to fetch customer" },                           // Generic error message to avoid exposing internals.
      { status: 500 }                                                  // HTTP 500 = internal server error.
    );
  }
}

/**
 * PUT /api/customers/:customerId
 * Update a customer's profile, credit terms, and status.
 *
 * - All fields are optional; only provided fields overwrite existing values.
 * - Status transitions adjust timestamps:
 *   - ACTIVE   → sets convertedAt (if it was null), clears dormantAt.
 *   - DORMANT  → sets dormantAt.
 *   - PROSPECT → clears convertedAt + dormantAt.
 */
export async function PUT(
  req: NextRequest,                                                    // Incoming request carrying JSON body with updates.
  context: { params: Promise<{ customerId?: string }> }                // Dynamic route params with customerId.
) {
  try {
    const body = await req.json();                                     // Parse JSON body into a plain JS object.
    const { company } = await getDemoTenant();                         // Scope all updates to this company.

    const { customerId } = await context.params;                       // Await params and read `customerId`.
    if (!customerId) {                                                 // Guard: cannot update without an ID.
      return NextResponse.json(
        { error: "Customer ID is required" },                          // Explanation for client.
        { status: 400 }
      );
    }

    const existing = await db.customer.findFirst({                     // Retrieve the existing customer so we can merge updates.
      where: {
        id: customerId,                                                // Must match this ID.
        companyId: company.id,                                         // Must belong to this company.
        deletedAt: null,                                               // Don’t allow updates to soft-deleted customers.
      },
    });

    if (!existing) {                                                   // If no matching row is found...
      return NextResponse.json(
        { error: "Customer not found" },                               // ...return 404 Not Found.
        { status: 404 }
      );
    }

    // Handle status + timestamp behavior.
    const rawStatus = body.status as string | undefined;               // The new status, if provided.
    const normalizedStatus = rawStatus                                 // Normalize to uppercase if provided; otherwise keep existing.
      ? (rawStatus.toUpperCase() as "PROSPECT" | "ACTIVE" | "DORMANT")
      : existing.status;

    let nextConvertedAt = existing.convertedAt;                        // Start with current convertedAt.
    let nextDormantAt = existing.dormantAt;                            // Start with current dormantAt.

    if (rawStatus) {                                                   // Only adjust timestamps if status is explicitly provided.
      if (normalizedStatus === "ACTIVE") {                             // If moving to ACTIVE...
        if (!existing.convertedAt) {                                   // ...and there was no conversion timestamp yet...
          nextConvertedAt = new Date();                                // ...set conversion time to now.
        }
        nextDormantAt = null;                                          // ACTIVE customers are not dormant.
      } else if (normalizedStatus === "DORMANT") {                     // If moving to DORMANT...
        nextDormantAt = new Date();                                    // ...set dormant timestamp.
      } else if (normalizedStatus === "PROSPECT") {                    // If moving back to PROSPECT...
        nextConvertedAt = null;                                        // ...clear conversion timestamp.
        nextDormantAt = null;                                          // ...clear dormant timestamp.
      }
    }

    const updated = await db.customer.update({                         // Perform the update in the database.
      where: { id: customerId },                                       // Select the row by primary key.
      data: {
        // BASIC PROFILE
        name:
          body.name !== undefined                                      // If name is provided...
            ? String(body.name).trim()                                 // ...normalize and trim it.
            : existing.name,                                           // Otherwise keep existing value.
        type:
          body.type !== undefined
            ? body.type ?? null
            : existing.type,
        mcNumber:
          body.mcNumber !== undefined
            ? body.mcNumber ?? null
            : existing.mcNumber,
        email:
          body.email !== undefined
            ? body.email ?? null
            : existing.email,
        phone:
          body.phone !== undefined
            ? body.phone ?? null
            : existing.phone,
        notes:
          body.notes !== undefined
            ? body.notes ?? null
            : existing.notes,
        companyNotes:
          body.companyNotes !== undefined
            ? body.companyNotes ?? null
            : existing.companyNotes,

        // ADDRESS INFO
        addressLine1:
          body.addressLine1 !== undefined
            ? body.addressLine1 ?? null
            : existing.addressLine1,
        addressLine2:
          body.addressLine2 !== undefined
            ? body.addressLine2 ?? null
            : existing.addressLine2,
        city:
          body.city !== undefined
            ? body.city ?? null
            : existing.city,
        state:
          body.state !== undefined
            ? body.state ?? null
            : existing.state,
        postalCode:
          body.postalCode !== undefined
            ? body.postalCode ?? null
            : existing.postalCode,
        country:
          body.country !== undefined
            ? body.country ?? null
            : existing.country,

        // CREDIT / TERMS
        daysToPay:
          body.daysToPay !== undefined                                 // If daysToPay provided...
            ? body.daysToPay === null                                  // ...allow null to clear it.
              ? null
              : Number(body.daysToPay)                                 // ...otherwise cast to number.
            : existing.daysToPay,
        billingEmail:
          body.billingEmail !== undefined
            ? body.billingEmail ?? null
            : existing.billingEmail,
        creditHold:
          body.creditHold !== undefined
            ? Boolean(body.creditHold)
            : existing.creditHold,
        creditLimit:
          body.creditLimit !== undefined
            ? body.creditLimit === null
              ? null
              : Number(body.creditLimit)
            : existing.creditLimit,
        portalUrl:
          body.portalUrl !== undefined
            ? body.portalUrl ?? null
            : existing.portalUrl,

        // PIPELINE / STATUS
        leadStatus:
          body.leadStatus !== undefined
            ? body.leadStatus ?? null
            : existing.leadStatus,
        status: normalizedStatus,                                      // Use normalized status (existing or newly provided).
        convertedAt: nextConvertedAt,                                  // Possibly updated converted timestamp.
        dormantAt: nextDormantAt,                                      // Possibly updated dormant timestamp.

        // NOTE: deletedAt is NOT touched in PUT; DELETE handler manages soft-delete.
      },
    });

    return NextResponse.json(updated);                                 // Return the updated customer row.
  } catch (err) {
    console.error("[CUSTOMER_UPDATE_ERROR]", err);                     // Log the error for debugging.
    return NextResponse.json(
      { error: "Failed to update customer" },                          // Generic error message to the client.
      { status: 500 }                                                  // HTTP 500 = internal server error.
    );
  }
}

/**
 * DELETE /api/customers/:customerId
 * Soft-delete a customer by setting deletedAt and marking them DORMANT.
 */
export async function DELETE(
  _req: NextRequest,                                                   // Incoming HTTP request (unused).
  context: { params: Promise<{ customerId?: string }> }                // Dynamic params with customerId.
) {
  try {
    const { company } = await getDemoTenant();                         // Scope deletion by company.

    const { customerId } = await context.params;                       // Await params and read `customerId`.
    if (!customerId) {                                                 // Guard: cannot delete without an ID.
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.customer.findFirst({                     // Ensure the customer exists and belongs to this company.
      where: {
        id: customerId,
        companyId: company.id,
        deletedAt: null,
      },
    });

    if (!existing) {                                                   // If customer already deleted or never existed...
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    await db.customer.update({                                         // Soft-delete instead of hard-delete.
      where: { id: customerId },
      data: {
        deletedAt: new Date(),                                         // Record when they were deleted.
        status: "DORMANT",                                             // Mark status dormant as part of lifecycle.
      },
    });

    return NextResponse.json({ success: true });                       // Return a simple success flag.
  } catch (err) {
    console.error("[CUSTOMER_DELETE_ERROR]", err);                     // Log failure details.
    return NextResponse.json(
      { error: "Failed to delete customer" },                          // Generic error payload.
      { status: 500 }
    );
  }
}
