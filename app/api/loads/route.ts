import { NextRequest, NextResponse } from "next/server";               // Imports Next.js request/response helpers for building API route handlers.
import { db } from "@/lib/db";                                         // Imports the shared Prisma client instance to talk to the database.
import { getDemoTenant } from "@/lib/demoTenant";                      // Imports helper that ensures a demo Company + User exist and returns them.

/**
 * GET /api/loads
 * Returns all loads for the demo company, newest first.
 */
export async function GET() {                                          // Defines the GET handler for the /api/loads endpoint.
  try {                                                                // Wraps logic in try/catch so we can handle errors gracefully.
    const { company } = await getDemoTenant();                         // Ensures demo Company exists and retrieves it; we use its id for scoping.

    const loads = await db.load.findMany({                             // Queries the Load table for all loads belonging to this company.
      where: {
        companyId: company.id,                                         // Filters so we only see loads for this specific company (multi-tenant isolation).
        isSoftDeleted: false,                                          // Excludes loads that have been soft-deleted.
      },
      orderBy: { createdAt: "desc" },                                  // Sorts loads so the most recently created ones appear first.
      include: {                                                       // Optionally include some related data to make the list more useful.
        customer: true,                                                // Includes the related Customer row (if any).
        truck: true,                                                   // Includes the assigned Truck (if any).
        trailer: true,                                                 // Includes the assigned Trailer (if any).
        stops: true,                                                   // Includes LoadStop rows so we can see pickups/deliveries.
      },
    });

    return NextResponse.json(loads);                                   // Returns the array of loads as JSON with a 200 OK status.
  } catch (err) {                                                      // If anything throws during the DB query...
    console.error("[LOADS_GET_ERROR]", err);                           // Logs the error on the server with a clear tag for debugging.
    return NextResponse.json(                                          // Returns a structured error response to the client.
      { error: "Failed to fetch loads" },                              // Simple error message payload.
      { status: 500 }                                                  // HTTP 500 = internal server error.
    );
  }
}

/**
 * POST /api/loads
 * Creates a new load for the demo company + user, and optional stops.
 *
 * Expected JSON body example:
 * {
 *   "rate": 2000,
 *   "miles": 800,
 *   "fuelCost": 450,
 *   "broker": "Test Broker",
 *   "commodity": "Dry freight",
 *   "pickupDate": "2025-12-01",
 *   "deliveryDate": "2025-12-02",
 *   "stops": [
 *     {
 *       "type": "PICKUP",
 *       "name": "Acme Shipper",
 *       "addressLine1": "123 Main St",
 *       "city": "Dallas",
 *       "state": "TX",
 *       "postalCode": "75001",
 *       "scheduledAt": "2025-12-01T08:00:00.000Z",
 *       "bolNumber": "BOL123",
 *       "pickupNumber": "PU789"
 *     },
 *     {
 *       "type": "DELIVERY",
 *       "name": "Beta Receiver",
 *       "addressLine1": "456 Warehouse Rd",
 *       "city": "Houston",
 *       "state": "TX",
 *       "postalCode": "77001",
 *       "scheduledAt": "2025-12-02T10:00:00.000Z"
 *     }
 *   ]
 * }
 */
export async function POST(req: NextRequest) {                         // Defines the POST handler for creating a new load.
  try {
    const body = await req.json();                                     // Parses the incoming JSON request body into a JavaScript object.

    const { company, user } = await getDemoTenant();                   // Ensures demo Company + User exist and retrieves them.

    // 1) Create the core Load row.
    const load = await db.load.create({                                // Creates a new Load row inside the database.
      data: {
        companyId: company.id,                                         // REQUIRED: associates this load with the current company.
        userId: user.id,                                               // REQUIRED: marks which user created the load.

        customerId: body.customerId ?? null,                           // Optional: associates the load with a specific customer if provided.

        // FINANCIALS
        rate: Number(body.rate),                                       // REQUIRED: total revenue for the load; coerced to number.
        miles: Number(body.miles),                                     // REQUIRED: total miles; coerced to number.
        fuelCost: Number(body.fuelCost ?? 0),                          // REQUIRED: total fuel cost; defaults to 0 if not provided.
        lumper:
          body.lumper != null ? Number(body.lumper) : null,            // Optional lumper fees; null if not supplied.
        tolls:
          body.tolls != null ? Number(body.tolls) : null,              // Optional tolls; null if not supplied.
        otherCosts:
          body.otherCosts != null ? Number(body.otherCosts) : null,    // Optional miscellaneous costs; null if not supplied.

        // LOAD META
        broker: body.broker ?? null,                                   // Optional broker name or customer reference.
        commodity: body.commodity ?? null,                             // Optional commodity description.
        equipment: body.equipment ?? "DRY_VAN",                        // EquipmentType enum; defaults to DRY_VAN if not specified.
        isTeam: Boolean(body.isTeam ?? false),                         // Marks whether this is a team load (true) or solo (false).
        loadValue:
          body.loadValue != null ? Number(body.loadValue) : null,      // Optional cargo value for risk/insurance analytics.

        // DATES & STATUS
        pickupDate:
          body.pickupDate ? new Date(body.pickupDate) : null,          // Optional snapshot pickup date (for summary).
        deliveryDate:
          body.deliveryDate ? new Date(body.deliveryDate) : null,      // Optional snapshot delivery date (for summary).
        status: body.status ?? "BOOKED",                               // LoadStatus; defaults to BOOKED for now.
      },
    });

    // 2) Optionally create LoadStop rows if client provided stops.
    if (Array.isArray(body.stops) && body.stops.length > 0) {          // Checks whether a non-empty stops array was provided in the payload.
      const stopsData = body.stops.map((stop: any, index: number) => { // Maps each incoming stop into a Prisma createMany payload row.
        const rawType = String(stop.type ?? "").toUpperCase();         // Reads the stop type from the body and uppercases it for consistency.
        const type =                                                   // Determines the StopType enum value.
          rawType === "DELIVERY" ? "DELIVERY" : "PICKUP";              // Uses DELIVERY if explicitly given, otherwise defaults to PICKUP.

        const sequence =
          typeof stop.sequence === "number" ? stop.sequence : index;   // Uses given sequence or falls back to the loop index for ordering.

        return {                                                       // Returns a plain object representing the LoadStop create payload.
          loadId: load.id,                                             // Links this stop to the load we just created.
          sequence,                                                    // Controls sort order of stops (0,1,2,...).
          type,                                                        // StopType enum: "PICKUP" or "DELIVERY".

          // Inline physical location fields (we can later switch to saved Location if needed).
          name: stop.name ?? null,                                     // Optional descriptive name for the stop (e.g., facility name).
          addressLine1: stop.addressLine1 ?? null,                     // Optional address line 1.
          addressLine2: stop.addressLine2 ?? null,                     // Optional address line 2.
          city: stop.city ?? null,                                     // Optional city.
          state: stop.state ?? null,                                   // Optional state.
          postalCode: stop.postalCode ?? null,                         // Optional ZIP/postal code.
          country: stop.country ?? "US",                               // Optional country; defaults to "US".

          scheduledAt: stop.scheduledAt                                // Optional scheduled appointment datetime.
            ? new Date(stop.scheduledAt)
            : null,
          arrivedAt: stop.arrivedAt ? new Date(stop.arrivedAt) : null, // Optional actual arrival time.
          departedAt: stop.departedAt ? new Date(stop.departedAt) : null, // Optional actual departure time.

          bolNumber: stop.bolNumber ?? null,                           // Optional BOL number associated with this stop.
          pickupNumber: stop.pickupNumber ?? null,                     // Optional pickup number/reference.
          notes: stop.notes ?? null,                                   // Optional free-text notes about this stop.
        };
      });

      await db.loadStop.createMany({                                   // Uses Prisma's createMany to insert all stop rows in one call.
        data: stopsData,                                               // Provides the mapped array of stop objects as the data payload.
      });
    }

    // 3) Fetch the load again including stops so the client immediately sees full data.
    const loadWithStops = await db.load.findUnique({                   // Re-queries the Load row we just created.
      where: { id: load.id },                                          // Filters by its primary key ID.
      include: { stops: true, customer: true, truck: true, trailer: true }, // Includes stops + customer + truck + trailer for convenience.
    });

    return NextResponse.json(loadWithStops, { status: 201 });          // Returns the created load (with stops) as JSON with HTTP 201 Created.
  } catch (err) {                                                      // If any error occurs during body parsing, load creation, or stops creation...
    console.error("[LOADS_POST_ERROR]", err);                          // Logs the error on the server with an identifying tag.
    return NextResponse.json(                                          // Sends a generic error response back to the client.
      { error: "Failed to create load" },                              // Simple error message payload.
      { status: 500 }                                                  // HTTP 500 = internal server error.
    );
  }
}
