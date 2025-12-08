import { NextRequest, NextResponse } from "next/server";               // Imports Next.js helpers for handling request/response in route handlers.
import { db } from "@/lib/db";                                         // Imports the shared Prisma client for database access.
import { getDemoTenant } from "@/lib/demoTenant";                      // Imports helper that returns (or creates) the demo Company + User.

/**
 * GET /api/loads/:id
 * Fetch a single load by ID for the current company, including related data.
 */
export async function GET(                                             // Defines the GET handler for /api/loads/[id].
  _req: NextRequest,                                                   // Incoming request object (unused here but required by signature).
  context: { params: Promise<{ id?: string }> }                        // Next.js now passes `params` as a Promise that must be awaited.
) {
  try {                                                                // Wraps the handler logic in try/catch for error handling.
    const { company } = await getDemoTenant();                         // Ensures we have a demo Company and retrieves it for scoping.

    const resolvedParams = await context.params;                       // Awaits the Promise to get the actual params object.
    const loadId = resolvedParams.id;                                  // Extracts the `id` value from the resolved params.

    if (!loadId) {                                                     // Guard: if no id is present after resolving params...
      return NextResponse.json(                                        // Respond with a 400 Bad Request.
        { error: "Load ID is required" },                              // JSON payload explaining the missing ID.
        { status: 400 }                                                // HTTP 400 status code.
      );
    }

    const load = await db.load.findFirst({                             // Queries the Load table to find a single load row.
      where: {                                                         // Defines filter criteria for the query.
        id: loadId,                                                    // Matches the provided load ID.
        companyId: company.id,                                         // Ensures the load belongs to the current company (multi-tenant safety).
        isSoftDeleted: false,                                          // Excludes loads that were soft-deleted.
      },
      include: {                                                       // Includes related data to provide a richer response.
        customer: true,                                                // Includes the associated Customer row, if any.
        truck: true,                                                   // Includes the assigned Truck, if any.
        trailer: true,                                                 // Includes the assigned Trailer, if any.
        loadDrivers: {                                                 // Includes driver assignments for this load.
          include: { driver: true },                                   // Includes each Driver row associated to the load.
        },
        stops: true,                                                   // Includes all LoadStop rows (pickups and deliveries).
        documents: true,                                               // Includes any Document rows linked to the load.
        expenses: true,                                                // Includes any Expense rows associated with the load.
        invoiceLinks: {                                                // Includes links to invoices for this load.
          include: { invoice: true },                                  // Includes the full Invoice rows for those links.
        },
      },
    });

    if (!load) {                                                       // If no load was found for this id + company...
      return NextResponse.json(                                        // Respond with 404 Not Found.
        { error: "Load not found" },                                   // JSON error payload explaining the issue.
        { status: 404 }                                                // HTTP 404 status code.
      );
    }

    return NextResponse.json(load);                                    // On success, return the load (with relations) as JSON.
  } catch (err) {                                                      // If any error occurs during execution...
    console.error("[LOAD_GET_ERROR]", err);                            // Log the error on the server console with a tag.
    return NextResponse.json(                                          // Respond to the client with a generic error.
      { error: "Failed to fetch load" },                               // JSON payload summarizing the failure.
      { status: 500 }                                                  // HTTP 500 internal server error.
    );
  }
}

/**
 * PUT /api/loads/:id
 * Update an existing load’s fields: financials, status, dates, assignments, etc.
 */
export async function PUT(                                             // Defines the PUT handler for /api/loads/[id].
  req: NextRequest,                                                    // Incoming request object, which carries the JSON body.
  context: { params: Promise<{ id?: string }> }                        // Route params passed as a Promise; must be awaited.
) {
  try {
    const body = await req.json();                                     // Parses the JSON payload from the request body into a JS object.
    const { company } = await getDemoTenant();                         // Retrieves the demo Company to scope updates to one tenant.

    const resolvedParams = await context.params;                       // Awaits params Promise to get the actual params object.
    const loadId = resolvedParams.id;                                  // Extracts the load ID from the resolved params.

    if (!loadId) {                                                     // Guard: if there is still no load ID...
      return NextResponse.json(                                        // Respond with 400 Bad Request.
        { error: "Load ID is required to update a load" },             // JSON message explaining the problem.
        { status: 400 }                                                // HTTP 400 status code.
      );
    }

    const existing = await db.load.findFirst({                         // Fetches the existing load to validate it belongs to this company.
      where: {
        id: loadId,                                                    // Matches by the provided ID.
        companyId: company.id,                                         // Ensures the load belongs to the same company.
        isSoftDeleted: false,                                          // Does not update soft-deleted loads.
      },
    });

    if (!existing) {                                                   // If no such load exists...
      return NextResponse.json(                                        // Respond with 404 Not Found.
        { error: "Load not found" },                                   // JSON message describing the error.
        { status: 404 }                                                // HTTP 404 status.
      );
    }

    const updated = await db.load.update({                             // Performs the update on the Load table.
      where: { id: loadId },                                           // Uses the resolved load ID as the unique key.
      data: {
        // RELATION FIELDS
        customerId:
          body.customerId !== undefined                                // If customerId is present in the body...
            ? body.customerId ?? null                                  // ...use it (allow null to clear).
            : existing.customerId,                                     // Otherwise, retain the existing value.
        trailerId:
          body.trailerId !== undefined                                 // Same pattern for trailerId.
            ? body.trailerId ?? null
            : existing.trailerId,
        truckId:
          body.truckId !== undefined                                   // Same pattern for truckId.
            ? body.truckId ?? null
            : existing.truckId,

        // CORE FINANCIALS
        rate:
          body.rate !== undefined                                      // If rate provided...
            ? Number(body.rate)                                        // ...coerce to number and use it.
            : existing.rate,                                           // Otherwise, keep old rate.
        miles:
          body.miles !== undefined                                     // Same pattern for miles.
            ? Number(body.miles)
            : existing.miles,
        fuelCost:
          body.fuelCost !== undefined                                  // Same for fuelCost.
            ? Number(body.fuelCost)
            : existing.fuelCost,
        lumper:
          body.lumper !== undefined                                    // If lumper is in body...
            ? body.lumper === null                                     // ...allow null to clear.
              ? null
              : Number(body.lumper)
            : existing.lumper,                                         // Otherwise keep existing.
        tolls:
          body.tolls !== undefined                                     // Same pattern for tolls.
            ? body.tolls === null
              ? null
              : Number(body.tolls)
            : existing.tolls,
        otherCosts:
          body.otherCosts !== undefined                                // Same for otherCosts.
            ? body.otherCosts === null
              ? null
              : Number(body.otherCosts)
            : existing.otherCosts,

        // LOAD META
        broker:
          body.broker !== undefined                                    // If broker is present...
            ? body.broker                                              // ...use value (string or null).
            : existing.broker,
        commodity:
          body.commodity !== undefined                                 // If commodity is present...
            ? body.commodity
            : existing.commodity,
        equipment:
          body.equipment !== undefined                                 // If equipment type present...
            ? body.equipment                                           // ...use it (must be valid EquipmentType).
            : existing.equipment,
        isTeam:
          body.isTeam !== undefined                                    // If isTeam present...
            ? Boolean(body.isTeam)                                     // ...cast to boolean and use.
            : existing.isTeam,
        loadValue:
          body.loadValue !== undefined                                 // If loadValue present...
            ? body.loadValue === null                                  // ...allow null to clear.
              ? null
              : Number(body.loadValue)
            : existing.loadValue,

        detentionHours:
          body.detentionHours !== undefined                            // If detentionHours provided...
            ? body.detentionHours === null
              ? null
              : Number(body.detentionHours)
            : existing.detentionHours,
        layoverDays:
          body.layoverDays !== undefined                               // If layoverDays provided...
            ? body.layoverDays === null
              ? null
              : Number(body.layoverDays)
            : existing.layoverDays,
        externalReference:
          body.externalReference !== undefined                         // If externalReference provided...
            ? body.externalReference
            : existing.externalReference,
        loadNumber:
          body.loadNumber !== undefined                                // If loadNumber provided...
            ? body.loadNumber
            : existing.loadNumber,
        tonuReason:
          body.tonuReason !== undefined                                // If tonuReason provided...
            ? body.tonuReason
            : existing.tonuReason,

        // DATES & STATUS
        pickupDate:
          body.pickupDate !== undefined && body.pickupDate !== null    // If pickupDate provided and not null...
            ? new Date(body.pickupDate)                                // ...parse into a Date instance.
            : body.pickupDate === null                                 // If explicitly null, clear field.
            ? null
            : existing.pickupDate,                                     // Otherwise retain existing value.
        deliveryDate:
          body.deliveryDate !== undefined && body.deliveryDate !== null// Same logic for deliveryDate.
            ? new Date(body.deliveryDate)
            : body.deliveryDate === null
            ? null
            : existing.deliveryDate,
        status:
          body.status !== undefined                                    // If status provided...
            ? body.status                                              // ...use it (must be valid LoadStatus).
            : existing.status,

        invoicedAt:
          body.invoicedAt !== undefined && body.invoicedAt !== null    // If invoicedAt provided and not null...
            ? new Date(body.invoicedAt)                                // ...parse to Date.
            : body.invoicedAt === null                                 // If explicitly null, clear.
            ? null
            : existing.invoicedAt,
        isPaid:
          body.isPaid !== undefined                                    // If isPaid present...
            ? Boolean(body.isPaid)                                     // ...cast to boolean and use.
            : existing.isPaid,
        paidAt:
          body.paidAt !== undefined && body.paidAt !== null            // If paidAt present and not null...
            ? new Date(body.paidAt)                                    // ...parse to Date.
            : body.paidAt === null                                     // If explicitly null, clear.
            ? null
            : existing.paidAt,                                         // Otherwise keep existing.
      },
    });

    return NextResponse.json(updated);                                 // Respond with the updated load as JSON payload.
  } catch (err) {                                                      // If error occurs anywhere in the handler...
    console.error("[LOAD_UPDATE_ERROR]", err);                         // Log it to the server console with a tag.
    return NextResponse.json(                                          // Respond with a generic error message.
      { error: "Failed to update load" },                              // JSON describing the failure.
      { status: 500 }                                                  // HTTP 500 internal server error.
    );
  }
}

/**
 * DELETE /api/loads/:id
 * Soft-deletes a load by setting isSoftDeleted + deletedAt (keeps history).
 */
export async function DELETE(                                          // Defines the DELETE handler for /api/loads/[id].
  _req: NextRequest,                                                   // Incoming request object (unused in this handler).
  context: { params: Promise<{ id?: string }> }                        // Route params passed as a Promise.
) {
  try {
    const { company } = await getDemoTenant();                         // Retrieves the demo Company for scoping deletes.

    const resolvedParams = await context.params;                       // Awaits params Promise to get the actual params.
    const loadId = resolvedParams.id;                                  // Extracts the load ID from the resolved params.

    if (!loadId) {                                                     // Guard: no ID provided.
      return NextResponse.json(                                        // Respond with 400 Bad Request.
        { error: "Load ID is required" },                              // JSON error message.
        { status: 400 }                                                // HTTP 400 status.
      );
    }

    const existing = await db.load.findFirst({                         // Checks whether a matching load exists for this company.
      where: {
        id: loadId,                                                    // Match by ID.
        companyId: company.id,                                         // Ensure same company.
        isSoftDeleted: false,                                          // Ignore already soft-deleted loads.
      },
    });

    if (!existing) {                                                   // If no such load exists...
      return NextResponse.json(                                        // Respond with 404 Not Found.
        { error: "Load not found" },                                   // JSON error payload.
        { status: 404 }                                                // HTTP 404 status code.
      );
    }

    await db.load.update({                                             // Performs a soft delete instead of a hard delete.
      where: { id: loadId },                                           // Selects the load row by ID.
      data: {
        isSoftDeleted: true,                                           // Marks the load as soft-deleted.
        deletedAt: new Date(),                                         // Records the timestamp of deletion.
      },
    });

    return NextResponse.json({ success: true });                       // Returns a simple success JSON response.
  } catch (err) {                                                      // If any error occurs during delete...
    console.error("[LOAD_DELETE_ERROR]", err);                         // Log the error with a tag.
    return NextResponse.json(                                          // Respond with a generic error payload.
      { error: "Failed to delete load" },                              // JSON error message.
      { status: 500 }                                                  // HTTP 500 internal server error.
    );
  }
}
