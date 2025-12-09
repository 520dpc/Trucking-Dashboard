import { NextRequest, NextResponse } from "next/server";           // Provides types/helpers for building Next.js route handlers.
import { db } from "@/lib/db";                                     // Prisma client for talking to the PostgreSQL database.
import { getDemoTenant } from "@/lib/demoTenant";                  // Helper to resolve the demo company + user for multi-tenant scoping.

// Next 16 passes `params` as a Promise, so we type it that way and always `await params`.
type RouteContext = {
  params: Promise<{
    customerId?: string;                                           // ID of the parent customer from the route.
    id?: string;                                                   // ID of the contact from the [id] segment.
  }>;
};

//
// GET /api/customers/:customerId/contacts/:id
// Fetch a single contact.
//
export async function GET(
  _req: NextRequest,                                               // Incoming request (unused here).
  { params }: RouteContext                                         // Receives params as a Promise in the context object.
) {
  try {
    const { customerId, id } = await params;                       // ✅ Correct: await the params Promise before using its properties.

    if (!customerId || !id) {                                      // Validate that both IDs are present.
      return NextResponse.json(
        { error: "Customer ID and contact ID are required" },      // Helpful error for bad requests.
        { status: 400 }                                            // HTTP 400 = client error.
      );
    }

    const { company } = await getDemoTenant();                     // Gets the demo company so we can scope queries.

    const contact = await db.contact.findFirst({                   // Look up this contact in the DB.
      where: {
        id,                                                        // Must match this contact ID.
        customerId,                                                // Must belong to this customer.
        companyId: company.id,                                     // Must belong to this company (multi-tenant isolation).
      },
    });

    if (!contact) {                                                // If it doesn’t exist...
      return NextResponse.json(
        { error: "Contact not found" },                            // Return a 404 with a clear message.
        { status: 404 }                                            // HTTP 404 = not found.
      );
    }

    return NextResponse.json(contact);                             // Otherwise, return the contact as JSON.
  } catch (err) {
    console.error("[CONTACT_GET_ERROR]", err);                     // Log unexpected errors on the server.
    return NextResponse.json(
      { error: "Failed to fetch contact" },                        // Generic error for the client.
      { status: 500 }                                              // HTTP 500 = internal server error.
    );
  }
}

//
// PUT /api/customers/:customerId/contacts/:id
// Update a single contact.
//
export async function PUT(
  req: NextRequest,                                                // Request containing JSON body with updated field values.
  { params }: RouteContext
) {
  try {
    const { customerId, id } = await params;                       // ✅ Await params again for this handler.

    if (!customerId || !id) {
      return NextResponse.json(
        { error: "Customer ID and contact ID are required" },
        { status: 400 }
      );
    }

    const { company } = await getDemoTenant();                     // Resolve demo company/user.
    const body = await req.json();                                 // Parse JSON body from the client.

    const rawName = String(body.name ?? "").trim();                // Ensure name is a non-empty string.
    if (!rawName) {
      return NextResponse.json(
        { error: "Contact name is required" },                     // Name is required to update.
        { status: 400 }
      );
    }

    // Ensure the contact exists and belongs to this company + customer.
    const existing = await db.contact.findFirst({
      where: {
        id,
        customerId,
        companyId: company.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    const updated = await db.contact.update({                      // Perform the update.
      where: { id },                                               // Primary key for the contact row.
      data: {
        name: rawName,                                             // Updated name.
        role: body.role ?? null,                                   // Role/title (optional).
        email: body.email ?? null,                                 // Email (optional).
        phone: body.phone ?? null,                                 // Phone (optional).
        notes: body.notes ?? null,                                 // Notes (optional).
      },
    });

    return NextResponse.json(updated);                             // Return the updated contact object.
  } catch (err) {
    console.error("[CONTACT_UPDATE_ERROR]", err);                   // Log unexpected errors.
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

//
// DELETE /api/customers/:customerId/contacts/:id
// Delete a single contact.
//
export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const { customerId, id } = await params;                       // ✅ Await params here as well.

    if (!customerId || !id) {
      return NextResponse.json(
        { error: "Customer ID and contact ID are required" },
        { status: 400 }
      );
    }

    const { company } = await getDemoTenant();

    // Confirm the contact exists and is correctly scoped.
    const existing = await db.contact.findFirst({
      where: {
        id,
        customerId,
        companyId: company.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    await db.contact.delete({                                      // Delete by primary key.
      where: { id },
    });

    return NextResponse.json({ success: true });                   // Simple success response.
  } catch (err) {
    console.error("[CONTACT_DELETE_ERROR]", err);                  // Log error details for debugging.
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}

