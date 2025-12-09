import { NextRequest, NextResponse } from "next/server";                       // \\ Next.js helpers for app router API handlers.
import { db } from "@/lib/db";                                                 // \\ Prisma client instance.

// Same demo auth helper pattern as in /api/drivers.                           // \\ Keeps scoping consistent across list/create + detail/update/delete.
async function getDemoAuthContext() {                                          // \\ Returns { user, company } for demo.
  let user = await db.user.findFirst({                                         // \\ Try to locate the demo user by email.
    where: { email: "demo@demo.com" },
    include: { company: true },                                                // \\ Also fetch the related company if present.
  });

  if (user && user.company) {                                                  // \\ If both exist...
    return { user, company: user.company };                                    // \\ ...reuse them.
  }

  let company;

  if (user?.companyId) {                                                       // \\ If user references a companyId...
    company =
      (await db.company.findUnique({ where: { id: user.companyId } })) ||      // \\ Try to load that.
      (await db.company.create({ data: { name: "Demo Company" } }));           // \\ Or create Demo Company if missing.
  } else {
    company =
      (await db.company.findFirst()) ||                                        // \\ Prefer any existing company...
      (await db.company.create({ data: { name: "Demo Company" } }));           // \\ ...otherwise create a new one.
  }

  if (!user) {                                                                 // \\ If no demo user exists yet...
    user = await db.user.create({                                              // \\ ...create one linked to the company.
      data: {
        email: "demo@demo.com",
        passwordHash: "placeholder",
        companyId: company.id,
        fullName: "Demo User",
      },
    });
  } else if (!user.companyId) {                                                // \\ If user had no companyId...
    user = await db.user.update({                                              // \\ ...patch to link the company.
      where: { id: user.id },
      data: { companyId: company.id },
    });
  }

  return { user, company };                                                    // \\ Done: return both.
}

// GET /api/drivers/:id → fetch a single driver by ID.                         // \\ Read endpoint for driver details.
export async function GET(
  _req: NextRequest,                                                           // \\ Request object, unused here.
  { params }: { params: Promise<{ id: string }> }                              // \\ Dynamic route params come as a Promise.
) {
  try {
    const { id } = await params;                                               // \\ Await params and pull out driver ID.

    if (!id) {                                                                 // \\ Guard: ID must be present.
      return NextResponse.json(
        { error: "Driver ID is required" },
        { status: 400 }
      );
    }

    const { company } = await getDemoAuthContext();                            // \\ Resolve company for scoping.

    const driver = await db.driver.findFirst({                                 // \\ Fetch driver row from DB.
      where: {
        id,                                                                    // \\ Must match specific ID.
        companyId: company.id,                                                 // \\ Must belong to this company (multi-tenant safety).
      },
    });

    if (!driver) {                                                             // \\ If no matching driver...
      return NextResponse.json(
        { error: "Driver not found" },                                         // \\ Tell the client it's missing.
        { status: 404 }                                                        // \\ HTTP 404 = not found.
      );
    }

    return NextResponse.json(driver);                                          // \\ On success, return driver as JSON.
  } catch (err) {
    console.error("[DRIVER_GET_ERROR]", err);                                  // \\ Log server error.
    return NextResponse.json(
      { error: "Failed to fetch driver" },                                     // \\ Generic error for client.
      { status: 500 }
    );
  }
}

// PUT /api/drivers/:id → update driver fields.                                // \\ Update endpoint for driver record.
export async function PUT(
  req: NextRequest,                                                            // \\ Incoming request with JSON payload.
  { params }: { params: Promise<{ id: string }> }                              // \\ Dynamic ID from URL, as a Promise.
) {
  try {
    const { id } = await params;                                               // \\ Await params and extract ID.

    if (!id) {                                                                 // \\ Guard for missing ID.
      return NextResponse.json(
        { error: "Driver ID is required" },
        { status: 400 }
      );
    }

    const { company } = await getDemoAuthContext();                            // \\ Resolve company to scope query.

    const existing = await db.driver.findFirst({                               // \\ Look up the existing driver row.
      where: { id, companyId: company.id },                                    // \\ Ensure it belongs to this company.
    });

    if (!existing) {                                                           // \\ If not found...
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    const body = await req.json();                                             // \\ Parse incoming updates.

    const {
      firstName,
      lastName,
      driverCode,
      isActive,
      hireDate,
      licenseNumber,
      licenseState,
      terminationDate,
    } = body;

    const updated = await db.driver.update({                                   // \\ Persist changes to DB.
      where: { id },                                                           // \\ Primary key selection.
      data: {
        firstName: firstName ?? existing.firstName,                            // \\ Only change name fields if provided.
        lastName: lastName ?? existing.lastName,
        driverCode: driverCode ?? existing.driverCode,                         // \\ Same for driverCode.
        isActive:
          typeof isActive === "boolean" ? isActive : existing.isActive,        // \\ Only override isActive if boolean was sent.
        hireDate:                                                              // \\ Update hireDate if provided; else keep current.
          hireDate != null
            ? (hireDate ? new Date(hireDate) : null)                           // \\ Explicit null clears it; string sets a new date.
            : existing.hireDate,
        licenseNumber:                                                         // \\ Optional license details.
          licenseNumber !== undefined ? licenseNumber : existing.licenseNumber,
        licenseState:
          licenseState !== undefined ? licenseState : existing.licenseState,
        terminationDate:
          terminationDate != null
            ? (terminationDate ? new Date(terminationDate) : null)             // \\ Allow explicit null to clear value.
            : existing.terminationDate,
      },
    });

    return NextResponse.json(updated);                                         // \\ Return updated driver record.
  } catch (err) {
    console.error("[DRIVER_UPDATE_ERROR]", err);                               // \\ Log unexpected errors.
    return NextResponse.json(
      { error: "Failed to update driver" },                                    // \\ Generic client-facing message.
      { status: 500 }
    );
  }
}

// DELETE /api/drivers/:id → remove a driver.                                  // \\ Hard delete endpoint (no soft-delete yet).
export async function DELETE(
  _req: NextRequest,                                                           // \\ Request object, unused.
  { params }: { params: Promise<{ id: string }> }                              // \\ ID from route.
) {
  try {
    const { id } = await params;                                               // \\ Await params and extract ID.

    if (!id) {                                                                 // \\ Guard for missing ID.
      return NextResponse.json(
        { error: "Driver ID is required" },
        { status: 400 }
      );
    }

    const { company } = await getDemoAuthContext();                            // \\ Resolve company context.

    const existing = await db.driver.findFirst({                               // \\ Ensure driver exists & belongs to this company.
      where: { id, companyId: company.id },
    });

    if (!existing) {                                                           // \\ If not found -> 404.
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    await db.driver.delete({                                                   // \\ Delete the row from the database.
      where: { id },                                                           // \\ Use primary key for delete.
    });

    return NextResponse.json({ success: true });                               // \\ Simple success response.
  } catch (err) {
    console.error("[DRIVER_DELETE_ERROR]", err);                               // \\ Log errors for debugging.
    return NextResponse.json(
      { error: "Failed to delete driver" },                                    // \\ Generic error response.
      { status: 500 }
    );
  }
}
