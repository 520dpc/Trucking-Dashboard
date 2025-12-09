import { NextRequest, NextResponse } from "next/server";                       // \\ Next.js request/response helpers for app route handlers.
import { db } from "@/lib/db";                                                 // \\ Shared Prisma client instance to talk to the database.

// Temporary demo auth helper: reuses existing demo user + company.            // \\ Same pattern as expenses so scoping is consistent.
async function getDemoAuthContext() {                                          // \\ Returns { user, company } for the demo environment.
  let user = await db.user.findFirst({                                         // \\ Try to find the demo user by email.
    where: { email: "demo@demo.com" },                                         // \\ Hard-coded until proper auth is added.
    include: { company: true },                                                // \\ Also load the related company if it exists.
  });

  if (user && user.company) {                                                  // \\ If both user and company are present...
    return { user, company: user.company };                                    // \\ ...reuse them so data lines up with existing records.
  }

  let company;                                                                 // \\ Will hold the resolved or newly created company.

  if (user?.companyId) {                                                       // \\ If the user has a companyId reference...
    company =
      (await db.company.findUnique({ where: { id: user.companyId } })) ||      // \\ Try to load that company from the DB.
      (await db.company.create({ data: { name: "Demo Company" } }));           // \\ If missing, create a fallback Demo Company.
  } else {                                                                     // \\ If there is no user or no companyId...
    company =
      (await db.company.findFirst()) ||                                        // \\ Reuse any existing company, if one exists.
      (await db.company.create({ data: { name: "Demo Company" } }));           // \\ Otherwise create a new Demo Company row.
  }

  if (!user) {                                                                 // \\ If we still don't have a user...
    user = await db.user.create({                                              // \\ ...create the demo user and attach it to the company.
      data: {
        email: "demo@demo.com",                                                // \\ Demo email identity.
        passwordHash: "placeholder",                                           // \\ Placeholder hash until real auth.
        companyId: company.id,                                                 // \\ Attach to resolved company.
        fullName: "Demo User",                                                 // \\ Optional human-readable name.
      },
    });
  } else if (!user.companyId) {                                                // \\ If user existed but had no companyId set...
    user = await db.user.update({                                              // \\ ...patch them to point at the resolved company.
      where: { id: user.id },
      data: { companyId: company.id },
    });
  }

  return { user, company };                                                    // \\ Return both objects for use by route handlers.
}

// GET /api/drivers → list all drivers for the demo company.                   // \\ Read endpoint to show driver roster.
export async function GET(_req: NextRequest) {                                 // \\ GET handler; we don't use the request itself yet.
  try {
    const { company } = await getDemoAuthContext();                            // \\ Resolve demo company context for scoping.

    const drivers = await db.driver.findMany({                                 // \\ Fetch drivers from the Driver table.
      where: { companyId: company.id },                                        // \\ Only drivers belonging to this company.
      orderBy: { createdAt: "desc" },                                          // \\ Newest first, for now.
    });

    return NextResponse.json(drivers);                                         // \\ Return list as JSON (may be [] if none exist).
  } catch (err) {
    console.error("[DRIVERS_GET_ERROR]", err);                                 // \\ Log unexpected server-side errors.
    return NextResponse.json(
      { error: "Failed to fetch drivers" },                                    // \\ Generic error message for the client.
      { status: 500 }                                                          // \\ HTTP 500 = internal server error.
    );
  }
}

// POST /api/drivers → create a new driver.                                    // \\ Write endpoint to add a driver to the fleet.
export async function POST(req: NextRequest) {                                 // \\ POST handler; consumes JSON body.
  try {
    const { company } = await getDemoAuthContext();                            // \\ Only need companyId for driver creation.
    const body = await req.json();                                             // \\ Parse JSON payload from the client.

    const {
      firstName,                                                               // \\ Required: driver's first name.
      lastName,                                                                // \\ Required: driver's last name.
      driverCode,                                                              // \\ Optional: unique internal code/ID, if used.
      isActive,                                                                // \\ Optional: active flag (defaults true if omitted).
      hireDate,                                                                // \\ Optional: hire date string (YYYY-MM-DD or ISO).
      licenseNumber,                                                           // \\ Optional: CDL/license number.
      licenseState,                                                            // \\ Optional: issuing state.
      terminationDate,                                                         // \\ Optional: termination date if inactive.
    } = body;

    if (!firstName || !lastName) {                                             // \\ Basic validation: we need at least a name.
      return NextResponse.json(
        { error: "firstName and lastName are required" },                      // \\ Explain the required fields.
        { status: 400 }                                                        // \\ HTTP 400 = bad request (client input error).
      );
    }

    const driver = await db.driver.create({                                    // \\ Insert new row into Driver table.
      data: {
        companyId: company.id,                                                 // \\ Link driver to this company (multi-tenant).
        firstName,                                                             // \\ Store first name as provided.
        lastName,                                                              // \\ Store last name as provided.
        driverCode: driverCode ?? null,                                        // \\ Optional driver code, or null.
        isActive: typeof isActive === "boolean" ? isActive : true,             // \\ Default to true if not explicitly set.
        hireDate: hireDate ? new Date(hireDate) : null,                        // \\ Convert hire date string to Date, or null.
        licenseNumber: licenseNumber ?? null,                                  // \\ Optional fields stored as null if missing.
        licenseState: licenseState ?? null,
        terminationDate: terminationDate ? new Date(terminationDate) : null,   // \\ Termination date if provided, otherwise null.
      },
    });

    return NextResponse.json(driver, { status: 201 });                         // \\ Return the created driver with HTTP 201 Created.
  } catch (err) {
    console.error("[DRIVERS_POST_ERROR]", err);                                // \\ Log failure details.
    return NextResponse.json(
      { error: "Failed to create driver" },                                    // \\ Generic error message for client.
      { status: 500 }                                                          // \\ HTTP 500 = internal server error.
    );
  }
}
