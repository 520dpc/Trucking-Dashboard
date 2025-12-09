import { NextRequest, NextResponse } from "next/server";                       // Next.js helpers for handling app route API requests.
import { db } from "@/lib/db";                                                 // Prisma client instance to query/update the database.

// Same demo auth helper pattern as other resources (drivers, expenses).       // Keeps scoping consistent across all demo APIs.
async function getDemoAuthContext() {                                          // Returns { user, company } for demo routes.
  let user = await db.user.findFirst({                                         // Try to load the demo user.
    where: { email: "demo@demo.com" },                                         // Hard-coded identifier for now.
    include: { company: true },                                                // Eager-load the linked company if present.
  });

  if (user && user.company) {                                                  // If both exist...
    return { user, company: user.company };                                    // ...reuse them as-is.
  }

  let company;                                                                 // Will hold the resolved Company row.

  if (user?.companyId) {                                                       // If the user references a companyId...
    company =
      (await db.company.findUnique({ where: { id: user.companyId } })) ||      // Try to load that company by ID.
      (await db.company.create({ data: { name: "Demo Company" } }));           // Or create Demo Company if missing.
  } else {
    company =
      (await db.company.findFirst()) ||                                        // Reuse any existing company if one exists.
      (await db.company.create({ data: { name: "Demo Company" } }));           // Otherwise create a new Demo Company.
  }

  if (!user) {                                                                 // If demo user does not yet exist...
    user = await db.user.create({                                              // ...create the user and link to company.
      data: {
        email: "demo@demo.com",
        passwordHash: "placeholder",
        companyId: company.id,
        fullName: "Demo User",
      },
    });
  } else if (!user.companyId) {                                                // If user existed but had no companyId...
    user = await db.user.update({                                              // ...patch them to link to the resolved company.
      where: { id: user.id },
      data: { companyId: company.id },
    });
  }

  return { user, company };                                                    // Return common context object.
}

// GET /api/trucks/:id → fetch a single truck by ID.                           // Read endpoint for truck details.
export async function GET(
  _req: NextRequest,                                                           // Request object (unused here).
  { params }: { params: Promise<{ id: string }> }                              // Dynamic route params come as a Promise in Next 16.
) {
  try {
    const { id } = await params;                                               // Await params and destructure the truck ID.

    if (!id) {                                                                 // Guard: ID is required.
      return NextResponse.json(
        { error: "Truck ID is required" },                                     // Explain missing path parameter.
        { status: 400 }                                                        // HTTP 400 = bad request.
      );
    }

    const { company } = await getDemoAuthContext();                            // Resolve which company we’re scoped to.

    const truck = await db.truck.findFirst({                                   // Try to load the truck from the database.
      where: {
        id,                                                                    // Must match this ID.
        companyId: company.id,                                                 // Must belong to this company (multi-tenant safety).
      },
    });

    if (!truck) {                                                              // If no truck was found...
      return NextResponse.json(
        { error: "Truck not found" },                                          // Notify the client it doesn’t exist.
        { status: 404 }                                                        // HTTP 404 = not found.
      );
    }

    return NextResponse.json(truck);                                           // On success, return the truck record as JSON.
  } catch (err) {
    console.error("[TRUCK_GET_ERROR]", err);                                   // Log unexpected errors.
    return NextResponse.json(
      { error: "Failed to fetch truck" },                                      // Generic error message for frontend.
      { status: 500 }                                                          // HTTP 500 = internal server error.
    );
  }
}

// PUT /api/trucks/:id → update an existing truck.                             // Update endpoint for truck data.
export async function PUT(
  req: NextRequest,                                                            // Request containing a JSON body with updated fields.
  { params }: { params: Promise<{ id: string }> }                              // Dynamic route params as a Promise.
) {
  try {
    const { id } = await params;                                               // Await and extract truck ID.

    if (!id) {                                                                 // Guard: must have ID from URL.
      return NextResponse.json(
        { error: "Truck ID is required" },
        { status: 400 }
      );
    }

    const { company } = await getDemoAuthContext();                            // Resolve company for scoping.

    const existing = await db.truck.findFirst({                                // Load the current truck row to merge changes.
      where: { id, companyId: company.id },                                    // Ensure it belongs to this company.
    });

    if (!existing) {                                                           // If no match...
      return NextResponse.json(
        { error: "Truck not found" },
        { status: 404 }
      );
    }

    const body = await req.json();                                             // Parse incoming JSON with updated fields.

    const {
      unitNumber,
      vin,
      year,
      make,
      model,
      type,
      status,
      condition,
      inactiveReason,
      lastPmAt,
      monthlyPayment,
      odometer,
      purchasePrice,
    } = body;

    const updated = await db.truck.update({                                    // Apply updates to the Truck row.
      where: { id },                                                           // Target this truck by primary key.
      data: {
        unitNumber: unitNumber ?? existing.unitNumber,                         // Update unitNumber only if provided.
        vin: vin !== undefined ? vin : existing.vin,                           // Allow explicit null/empty string if needed.
        year:
          year !== undefined                                                   // If year explicitly provided...
            ? (typeof year === "number" ? year : null)                         // ...coerce to number or null.
            : existing.year,                                                   // Otherwise keep the existing value.
        make: make !== undefined ? make : existing.make,                       // Same pattern for text fields.
        model: model !== undefined ? model : existing.model,
        type: type !== undefined ? type : existing.type,
        status: status ?? existing.status,                                     // If a new TruckStatus is provided, use it.
        condition:
          condition !== undefined ? condition : existing.condition,
        inactiveReason:
          inactiveReason !== undefined
            ? inactiveReason
            : existing.inactiveReason,
        lastPmAt:
          lastPmAt !== undefined                                               // If lastPmAt explicitly sent...
            ? (lastPmAt ? new Date(lastPmAt) : null)                           // ...convert to Date or clear with null.
            : existing.lastPmAt,
        monthlyPayment:
          monthlyPayment !== undefined                                         // Numeric fields: allow override or keep.
            ? (typeof monthlyPayment === "number" ? monthlyPayment : null)
            : existing.monthlyPayment,
        odometer:
          odometer !== undefined
            ? (typeof odometer === "number" ? odometer : null)
            : existing.odometer,
        purchasePrice:
          purchasePrice !== undefined
            ? (typeof purchasePrice === "number" ? purchasePrice : null)
            : existing.purchasePrice,
      },
    });

    return NextResponse.json(updated);                                         // Return the updated truck record as JSON.
  } catch (err) {
    console.error("[TRUCK_UPDATE_ERROR]", err);                                // Log update failures for debugging.
    return NextResponse.json(
      { error: "Failed to update truck" },                                     // Generic error message for client.
      { status: 500 }
    );
  }
}

// DELETE /api/trucks/:id → remove a truck.                                    // Hard delete; we can add soft-delete later if needed.
export async function DELETE(
  _req: NextRequest,                                                           // Request object, unused.
  { params }: { params: Promise<{ id: string }> }                              // Dynamic params with truck ID.
) {
  try {
    const { id } = await params;                                               // Await and extract ID.

    if (!id) {                                                                 // Guard: must have ID.
      return NextResponse.json(
        { error: "Truck ID is required" },
        { status: 400 }
      );
    }

    const { company } = await getDemoAuthContext();                            // Resolve company context.

    const existing = await db.truck.findFirst({                                // Ensure truck exists & belongs to this company.
      where: { id, companyId: company.id },
    });

    if (!existing) {                                                           // If no such truck...
      return NextResponse.json(
        { error: "Truck not found" },
        { status: 404 }
      );
    }

    await db.truck.delete({                                                    // Delete the truck row from DB.
      where: { id },                                                           // Use primary key for the delete.
    });

    return NextResponse.json({ success: true });                               // Simple success response payload.
  } catch (err) {
    console.error("[TRUCK_DELETE_ERROR]", err);                                // Log deletion failure.
    return NextResponse.json(
      { error: "Failed to delete truck" },                                     // Generic error message for client.
      { status: 500 }
    );
  }
}
