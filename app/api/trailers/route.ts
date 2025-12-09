import { NextRequest, NextResponse } from "next/server";              // Imports Next.js request/response helpers for app router API routes.
import { db } from "@/lib/db";                                        // Imports the shared Prisma client for talking to the database.

// TEMP: Demo auth helper – returns a demo user + company so we can scope data.  // This keeps everything multi-tenant even before real auth is wired in.
async function getDemoAuthContext() {                                  // Defines a helper function to resolve the current demo user + company.
  let user = await db.user.findFirst({                                 // Tries to find the demo user row in the User table.
    where: { email: "demo@demo.com" },                                 // Filters by the fixed demo email address.
    include: { company: true },                                        // Also loads the related Company row if there is one.
  });

  if (user && user.company) {                                          // If both a user and linked company already exist...
    return { user, company: user.company };                            // ...we can return them directly and skip the creation logic.
  }

  let company;                                                         // Will hold the resolved Company instance.

  if (user?.companyId) {                                               // If the user exists and has a companyId set...
    company =
      (await db.company.findUnique({ where: { id: user.companyId } })) // ...attempt to load that company by ID.
      || (await db.company.create({ data: { name: "Demo Company" } })); // If that fails, create a new demo company.
  } else {                                                             // If the user doesn’t exist or has no companyId...
    company =
      (await db.company.findFirst())                                   // ...try to reuse any existing company in the DB...
      || (await db.company.create({ data: { name: "Demo Company" } })); // ...or create a new company if none exist.
  }

  if (!user) {                                                         // If the demo user record does not exist yet...
    user = await db.user.create({                                      // ...create the demo user now.
      data: {
        email: "demo@demo.com",                                        // Hard-coded demo email – later replaced by real auth.
        passwordHash: "placeholder",                                   // Placeholder password hash field.
        companyId: company.id,                                         // Link this user to the resolved company.
        fullName: "Demo User",                                         // Optional name for display purposes.
      },
    });
  } else if (!user.companyId) {                                        // If the user exists but is not linked to any company...
    user = await db.user.update({                                      // ...update the user row to attach a companyId.
      where: { id: user.id },
      data: { companyId: company.id },
    });
  }

  return { user, company };                                            // Return the user + company context to callers.
}

// GET /api/trailers → list all trailers for the demo company.
export async function GET(_req: NextRequest) {                          // Handles GET requests for /api/trailers.
  try {
    const { company } = await getDemoAuthContext();                     // Resolves the company context (multi-tenant scoping).

    const trailers = await db.trailer.findMany({                        // Queries the Trailer table.
      where: { companyId: company.id },                                 // Only returns trailers belonging to this company.
      orderBy: { createdAt: "desc" },                                   // Sorts results by newest first.
    });

    return NextResponse.json(trailers);                                 // Responds with a JSON array of trailers (possibly empty).
  } catch (err) {
    console.error("[TRAILERS_GET_ERROR]", err);                         // Logs any unexpected error to the server console.
    return NextResponse.json(                                          // Returns a generic error response.
      { error: "Failed to fetch trailers" },                            // Human-readable error message for the client.
      { status: 500 }                                                   // HTTP 500 = internal server error.
    );
  }
}

// POST /api/trailers → create a new trailer.
export async function POST(req: NextRequest) {                          // Handles POST requests for /api/trailers.
  try {
    const { company } = await getDemoAuthContext();                     // Resolves the current company to attach the new trailer to.
    const body = await req.json();                                      // Parses the JSON request body into a plain object.

    const {
      trailerNumber,                                                    // Required: visible trailer/unit identifier.
      year,                                                             // Optional: model year.
      type,                                                             // Optional: TrailerType enum (string value).
      lengthFeet,                                                       // Optional: trailer length in feet.
      status,                                                           // Optional: TrailerStatus enum string.
      condition,                                                        // Optional: condition notes.
      inactiveReason,                                                   // Optional: reason the trailer is inactive.
      isReefer,                                                         // Optional: whether this is a reefer.
      hasAirChute,                                                      // Optional: whether there is an air chute.
      airChuteType,                                                     // Optional: air chute type string.
      assignedTruckId,                                                  // Optional: FK to a Truck row.

      // NEW rental-related fields from the client:
      isRentedOut,                                                      // Optional: whether the trailer is rented out.
      rentalRateMonthly,                                                // Optional: monthly rental rate in dollars.
      rentedToCustomerId,                                               // Optional: FK to the Customer renting this trailer.
    } = body;

    if (!trailerNumber) {                                               // Validates that the client provided a trailerNumber.
      return NextResponse.json(
        { error: "trailerNumber is required" },                         // Explains which field is missing.
        { status: 400 }                                                 // HTTP 400 = bad request from the client.
      );
    }

    // Business rule: if trailer is rented out, we need both rate + customer.
    if (isRentedOut === true) {                                         // Checks if the client declared this trailer as rented out.
      if (
        rentalRateMonthly === undefined                                // Missing rentalRateMonthly entirely...
        || rentalRateMonthly === null                                  // ...or explicitly null...
        || Number(rentalRateMonthly) <= 0                              // ...or not a positive number.
      ) {
        return NextResponse.json(
          { error: "rentalRateMonthly must be a positive number when isRentedOut is true" }, // Clear validation error.
          { status: 400 }
        );
      }

      if (!rentedToCustomerId) {                                        // If no customer ID is provided for a rented trailer...
        return NextResponse.json(
          { error: "rentedToCustomerId is required when isRentedOut is true" }, // Require a linked customer.
          { status: 400 }
        );
      }
    }

    const trailer = await db.trailer.create({                           // Creates a new Trailer row in the database.
      data: {
        companyId: company.id,                                          // Always store which company owns this trailer.
        trailerNumber,                                                  // Saves the visible trailer number.
        year: typeof year === "number" ? year : null,                   // Coerces year to number or null.
        type: type ?? undefined,                                        // Optional TrailerType: use default if not provided.
        lengthFeet:
          typeof lengthFeet === "number" ? lengthFeet : null,           // Coerces lengthFeet to number or null.
        status: status ?? undefined,                                    // Optional TrailerStatus override.
        condition: condition ?? null,                                   // Stores condition text or null.
        inactiveReason: inactiveReason ?? null,                         // Stores inactive reason or null.
        isReefer:
          typeof isReefer === "boolean" ? isReefer : false,             // Defaults to false unless explicitly set.
        hasAirChute:
          typeof hasAirChute === "boolean" ? hasAirChute : false,       // Defaults to false unless explicitly set.
        airChuteType: airChuteType ?? null,                             // Stores airChuteType or null.
        assignedTruckId: assignedTruckId ?? null,                       // Stores assignedTruckId or null.

        // NEW rental fields:
        isRentedOut: isRentedOut === true,                              // Coerces to a strict boolean: true only if explicitly true.
        rentalRateMonthly:
          rentalRateMonthly !== undefined && rentalRateMonthly !== null // If value is provided...
            ? Number(rentalRateMonthly)                                 // ...cast it to a number.
            : null,                                                     // Otherwise store null.
        rentedToCustomerId: rentedToCustomerId ?? null,                 // Stores customer ID or null if not rented.
      },
    });

    return NextResponse.json(trailer, { status: 201 });                 // Returns the created trailer with HTTP 201 Created.
  } catch (err) {
    console.error("[TRAILERS_POST_ERROR]", err);                        // Logs the error to the server console for debugging.
    return NextResponse.json(
      { error: "Failed to create trailer" },                            // Generic error response for the client.
      { status: 500 }                                                   // HTTP 500 = server-side error.
    );
  }
}
