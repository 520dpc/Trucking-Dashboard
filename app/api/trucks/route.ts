import { NextRequest, NextResponse } from "next/server";                       // Handles incoming requests and building JSON responses in Next.js app routes.
import { db } from "@/lib/db";                                                 // Shared Prisma client instance for talking to the database.

// Temporary demo auth helper: reuses existing demo user + company.            // Keeps all demo data (loads, expenses, drivers, trucks) under one company.
async function getDemoAuthContext() {                                          // Returns { user, company } for all demo API routes.
  let user = await db.user.findFirst({                                         // Try to find the demo user by email.
    where: { email: "demo@demo.com" },                                         // Hard-coded email until we add real authentication.
    include: { company: true },                                                // Eager-load the related company if it exists.
  });

  if (user && user.company) {                                                  // If both user and company are found...
    return { user, company: user.company };                                    // ...reuse them so demo data stays consistent.
  }

  let company;                                                                 // Will hold the resolved or newly created Company row.

  if (user?.companyId) {                                                       // If the user has a companyId reference...
    company =
      (await db.company.findUnique({ where: { id: user.companyId } })) ||      // Try to load that specific company.
      (await db.company.create({ data: { name: "Demo Company" } }));           // If missing, create a new Demo Company row.
  } else {                                                                     // If there’s no user or no companyId...
    company =
      (await db.company.findFirst()) ||                                        // Reuse any existing company if one exists in DB.
      (await db.company.create({ data: { name: "Demo Company" } }));           // Otherwise create a fresh Demo Company.
  }

  if (!user) {                                                                 // If the demo user doesn’t exist yet...
    user = await db.user.create({                                              // ...create it and attach it to the resolved company.
      data: {
        email: "demo@demo.com",                                                // Demo email placeholder.
        passwordHash: "placeholder",                                           // Placeholder hash until we wire real auth.
        companyId: company.id,                                                 // Attach to this company for multi-tenant scoping.
        fullName: "Demo User",                                                 // Optional display name.
      },
    });
  } else if (!user.companyId) {                                                // If user existed but wasn’t linked to a company...
    user = await db.user.update({                                              // ...patch user to reference the resolved company.
      where: { id: user.id },
      data: { companyId: company.id },
    });
  }

  return { user, company };                                                    // Return both for route handlers to use.
}

// GET /api/trucks → list all trucks for the demo company.                     // Read endpoint to retrieve the fleet truck list.
export async function GET(_req: NextRequest) {                                 // Handles GET requests; we ignore the req for now.
  try {
    const { company } = await getDemoAuthContext();                            // Resolve which company’s trucks we’re dealing with.

    const trucks = await db.truck.findMany({                                   // Query the Truck table.
      where: { companyId: company.id },                                        // Only trucks belonging to this company.
      orderBy: { createdAt: "desc" },                                          // Sort by newest first for now.
    });

    return NextResponse.json(trucks);                                          // Return trucks as JSON (may be an empty array).
  } catch (err) {
    console.error("[TRUCKS_GET_ERROR]", err);                                  // Log unexpected server-side errors.
    return NextResponse.json(
      { error: "Failed to fetch trucks" },                                     // Generic error message for the client.
      { status: 500 }                                                          // HTTP 500 = internal server error.
    );
  }
}

// POST /api/trucks → create a new truck for the demo company.                 // Write endpoint to add a truck to the fleet.
export async function POST(req: NextRequest) {                                 // Handles POST requests with JSON payloads.
  try {
    const { company } = await getDemoAuthContext();                            // Resolve company context to set companyId.
    const body = await req.json();                                             // Parse JSON body from the request.

    const {
      unitNumber,                                                              // Required: our internal truck/unit identifier.
      vin,                                                                     // Optional: VIN (unique if provided).
      year,                                                                    // Optional: model year.
      make,                                                                    // Optional: manufacturer.
      model,                                                                   // Optional: model name.
      type,                                                                    // Optional: type string (e.g., "TRACTOR").
      status,                                                                  // Optional: TruckStatus enum string, defaults to ACTIVE.
      condition,                                                               // Optional: condition text.
      inactiveReason,                                                          // Optional: reason text if not ACTIVE.
      lastPmAt,                                                                // Optional: date string for last preventive maintenance.
      monthlyPayment,                                                          // Optional: monthly finance/lease cost.
      odometer,                                                                // Optional: current odometer reading.
      purchasePrice,                                                           // Optional: acquisition cost.
    } = body;

    if (!unitNumber) {                                                         // Basic validation: unitNumber is required.
      return NextResponse.json(
        { error: "unitNumber is required" },                                   // Explain which field is missing.
        { status: 400 }                                                        // HTTP 400 = bad request (client error).
      );
    }

    const truck = await db.truck.create({                                      // Create a new Truck row in the database.
      data: {
        companyId: company.id,                                                 // Always associate truck with this company (multi-tenant).
        unitNumber,                                                            // Store required unitNumber exactly as provided.
        vin: vin ?? null,                                                      // Optional fields: store null if missing.
        year: typeof year === "number" ? year : null,                          // Coerce year into number or null.
        make: make ?? null,
        model: model ?? null,
        type: type ?? null,
        status: status ?? undefined,                                           // Optional status; if omitted, Prisma uses default ACTIVE.
        condition: condition ?? null,
        inactiveReason: inactiveReason ?? null,
        lastPmAt: lastPmAt ? new Date(lastPmAt) : null,                        // Convert dates from string to Date if provided.
        monthlyPayment:
          typeof monthlyPayment === "number" ? monthlyPayment : null,          // Numeric cost fields as Int or null.
        odometer: typeof odometer === "number" ? odometer : null,
        purchasePrice:
          typeof purchasePrice === "number" ? purchasePrice : null,
      },
    });

    return NextResponse.json(truck, { status: 201 });                          // Return the created truck with HTTP 201 Created.
  } catch (err) {
    console.error("[TRUCKS_POST_ERROR]", err);                                 // Log server error for debugging.
    return NextResponse.json(
      { error: "Failed to create truck" },                                     // Generic client-facing error message.
      { status: 500 }                                                          // HTTP 500 = internal server error.
    );
  }
}
