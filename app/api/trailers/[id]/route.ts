import { NextRequest, NextResponse } from "next/server";              // Imports Next.js helpers for server-side API routes.
import { db } from "@/lib/db";                                        // Imports Prisma client instance for DB operations.

// Same demo auth helper pattern used across the project.              // Ensures all data is scoped by company.
async function getDemoAuthContext() {                                 // Resolves (or creates) a demo user + company.
  let user = await db.user.findFirst({                                // Tries to find the demo user row.
    where: { email: "demo@demo.com" },                                // Filters by fixed demo email.
    include: { company: true },                                       // Also loads the related company row if available.
  });

  if (user && user.company) {                                         // If user already has a linked company...
    return { user, company: user.company };                           // ...return them immediately.
  }

  let company;                                                        // Will hold the company instance.

  if (user?.companyId) {                                              // If user has a companyId set...
    company =
      (await db.company.findUnique({ where: { id: user.companyId } })) // ...attempt to load that company.
      || (await db.company.create({ data: { name: "Demo Company" } })); // Or create one if it doesn’t exist.
  } else {                                                            // If user missing or no companyId...
    company =
      (await db.company.findFirst())                                  // Try to reuse an existing company...
      || (await db.company.create({ data: { name: "Demo Company" } })); // Or create a fresh demo company.
  }

  if (!user) {                                                        // If the user doesn’t exist yet...
    user = await db.user.create({                                     // ...create a demo user linked to this company.
      data: {
        email: "demo@demo.com",
        passwordHash: "placeholder",
        companyId: company.id,
        fullName: "Demo User",
      },
    });
  } else if (!user.companyId) {                                       // If user exists but is not linked to any company...
    user = await db.user.update({                                     // ...update to attach the company.
      where: { id: user.id },
      data: { companyId: company.id },
    });
  }

  return { user, company };                                           // Return both user and company to the caller.
}

// GET /api/trailers/:id → fetch a single trailer by ID.
export async function GET(
  _req: NextRequest,                                                  // Incoming request (unused).
  { params }: { params: Promise<{ id: string }> }                     // Route parameters wrapped in a Promise (Next 16 behavior).
) {
  try {
    const { id } = await params;                                      // Awaits the Promise and extracts the `id`.

    if (!id) {                                                        // If no ID was provided...
      return NextResponse.json(
        { error: "Trailer ID is required" },                          // Return a clear error message.
        { status: 400 }                                               // HTTP 400 = bad request.
      );
    }

    const { company } = await getDemoAuthContext();                   // Resolve company context for scoping.

    const trailer = await db.trailer.findFirst({                      // Query the Trailer table for this ID.
      where: {
        id,                                                           // Must match the provided ID.
        companyId: company.id,                                        // Must belong to this company.
      },
    });

    if (!trailer) {                                                   // If no trailer record is found...
      return NextResponse.json(
        { error: "Trailer not found" },                               // Return a 404 not found error.
        { status: 404 }
      );
    }

    return NextResponse.json(trailer);                                // On success, return the trailer as JSON.
  } catch (err) {
    console.error("[TRAILER_GET_ERROR]", err);                        // Log unexpected errors.
    return NextResponse.json(
      { error: "Failed to fetch trailer" },                           // Generic error message for the client.
      { status: 500 }                                                 // HTTP 500 = server error.
    );
  }
}

// PUT /api/trailers/:id → update an existing trailer.
export async function PUT(
  req: NextRequest,                                                   // Incoming HTTP request with JSON body.
  { params }: { params: Promise<{ id: string }> }                     // Dynamic route params as a Promise.
) {
  try {
    const { id } = await params;                                      // Await params and grab the trailer ID.

    if (!id) {                                                        // Guard against missing ID.
      return NextResponse.json(
        { error: "Trailer ID is required" },
        { status: 400 }
      );
    }

    const { company } = await getDemoAuthContext();                   // Resolve company for scoping.

    const existing = await db.trailer.findFirst({                     // Load the existing trailer row.
      where: {
        id,
        companyId: company.id,                                        // Ensure trailer belongs to this company.
      },
    });

    if (!existing) {                                                  // If no trailer is found...
      return NextResponse.json(
        { error: "Trailer not found" },
        { status: 404 }
      );
    }

    const body = await req.json();                                    // Parse the JSON body into a plain object.

    const {
      trailerNumber,
      year,
      type,
      lengthFeet,
      status,
      condition,
      inactiveReason,
      isReefer,
      hasAirChute,
      airChuteType,
      assignedTruckId,

      // Rental-related fields that can be updated:
      isRentedOut,
      rentalRateMonthly,
      rentedToCustomerId,
    } = body;

    // If client is turning rental ON, validate required fields.
    if (isRentedOut === true) {                                       // Only validate when switching or keeping it as rented.
      if (
        rentalRateMonthly === undefined                               // If no rentalRateMonthly is provided at all...
        || rentalRateMonthly === null                                 // ...or explicitly null...
        || Number(rentalRateMonthly) <= 0                             // ...or not a positive number.
      ) {
        return NextResponse.json(
          { error: "rentalRateMonthly must be a positive number when isRentedOut is true" }, // Explain the problem.
          { status: 400 }
        );
      }

      if (!rentedToCustomerId) {                                      // If no customer ID is provided for a rented trailer...
        return NextResponse.json(
          { error: "rentedToCustomerId is required when isRentedOut is true" }, // Require a customer.
          { status: 400 }
        );
      }
    }

    const updated = await db.trailer.update({                         // Perform the update in the database.
      where: { id },                                                  // Identify the row by primary key.
      data: {
        trailerNumber:
          trailerNumber !== undefined                                 // If trailerNumber was provided in the body...
            ? trailerNumber                                           // ...use the new value...
            : existing.trailerNumber,                                 // ...otherwise keep the existing one.

        year:
          year !== undefined                                          // If year was provided...
            ? (typeof year === "number" ? year : null)               // ...coerce to number or null.
            : existing.year,                                          // Otherwise, keep previous year.

        type: type !== undefined ? type : existing.type,              // Override type if provided.

        lengthFeet:
          lengthFeet !== undefined                                    // If lengthFeet is in payload...
            ? (typeof lengthFeet === "number" ? lengthFeet : null)   // ...coerce or null.
            : existing.lengthFeet,                                    // Else keep previous.

        status: status ?? existing.status,                            // Only override status if value is set.

        condition:
          condition !== undefined ? condition : existing.condition,   // Update condition text if provided.

        inactiveReason:
          inactiveReason !== undefined
            ? inactiveReason
            : existing.inactiveReason,                                // Update inactiveReason if provided.

        isReefer:
          typeof isReefer === "boolean"                               // Only override if a boolean is explicitly sent.
            ? isReefer
            : existing.isReefer,                                      // Else keep existing value.

        hasAirChute:
          typeof hasAirChute === "boolean"
            ? hasAirChute
            : existing.hasAirChute,                                   // Same pattern for hasAirChute.

        airChuteType:
          airChuteType !== undefined ? airChuteType : existing.airChuteType, // Optional override for airChuteType.

        assignedTruckId:
          assignedTruckId !== undefined
            ? assignedTruckId
            : existing.assignedTruckId,                               // Allow reassignment or clearing assignment.

        // Rental-related updates:
        isRentedOut:
          typeof isRentedOut === "boolean"                            // If client sent a boolean...
            ? isRentedOut
            : existing.isRentedOut,                                   // ...use it; otherwise keep previous.

        rentalRateMonthly:
          rentalRateMonthly !== undefined                             // If provided at all...
            ? (rentalRateMonthly === null ? null : Number(rentalRateMonthly)) // ...cast number or null.
            : existing.rentalRateMonthly,                             // Else keep previous rental rate.

        rentedToCustomerId:
          rentedToCustomerId !== undefined                            // If provided in payload...
            ? rentedToCustomerId                                      // ...use that (can be null to clear).
            : existing.rentedToCustomerId,                            // Else keep existing.
      },
    });

    return NextResponse.json(updated);                                // Return the updated trailer record as JSON.
  } catch (err) {
    console.error("[TRAILER_UPDATE_ERROR]", err);                     // Log any unexpected error.
    return NextResponse.json(
      { error: "Failed to update trailer" },                          // Generic error for frontend.
      { status: 500 }
    );
  }
}

// DELETE /api/trailers/:id → delete a trailer.
export async function DELETE(
  _req: NextRequest,                                                  // Incoming request (not used here).
  { params }: { params: Promise<{ id: string }> }                     // Dynamic route params Promise.
) {
  try {
    const { id } = await params;                                      // Await params and extract the ID.

    if (!id) {                                                        // Guard against missing ID.
      return NextResponse.json(
        { error: "Trailer ID is required" },
        { status: 400 }
      );
    }

    const { company } = await getDemoAuthContext();                   // Resolve company for scoping.

    const existing = await db.trailer.findFirst({                     // Ensure the trailer exists and belongs to this company.
      where: {
        id,
        companyId: company.id,
      },
    });

    if (!existing) {                                                  // If no trailer matches...
      return NextResponse.json(
        { error: "Trailer not found" },
        { status: 404 }
      );
    }

    await db.trailer.delete({                                         // Delete the trailer row from the database.
      where: { id },                                                  // Identify record by primary key.
    });

    return NextResponse.json({ success: true });                      // Return a simple success payload.
  } catch (err) {
    console.error("[TRAILER_DELETE_ERROR]", err);                     // Log deletion errors for debugging.
    return NextResponse.json(
      { error: "Failed to delete trailer" },                          // Generic error message.
      { status: 500 }                                                 // HTTP 500 = server-side failure.
    );
  }
}
