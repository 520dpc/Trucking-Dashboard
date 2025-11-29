import { NextRequest, NextResponse } from "next/server";        // Imports Next.js helpers for handling requests and sending JSON responses.
import { db } from "@/lib/db";                                  // Imports the Prisma client so we can talk to the database.

// GET /api/loads/:id → fetch a single load by ID.
export async function GET(
  req: NextRequest,                                             // Incoming HTTP request (not used here, but included for the handler signature).
  { params }: { params: Promise<{ id?: string }> }              // In your environment, Next.js provides `params` as a Promise, so we type it that way.
) {
  try {                                                         // Wrap handler logic in try/catch to handle errors cleanly.
    const { id } = await params;                                // Await the params Promise and extract the `id` from it.

    if (!id) {                                                  // Guard: if `id` is missing or undefined, the request is invalid.
      return NextResponse.json(                                // Return a 400 Bad Request response.
        { error: "Load ID is required" },                       // JSON error message explaining the problem.
        { status: 400 }                                         // HTTP 400 = client error.
      );
    }

    const load = await db.load.findUnique({                     // Queries the Load table for a single load record.
      where: { id },                                            // Uses the extracted `id` to find the load.
      include: {                                                // Optionally include related models.
        customer: true,                                         // Includes the related Customer record (if any).
        user: true,                                             // Includes the User who owns this load.
      },
    });

    if (!load) {                                                // If no load exists with that ID...
      return NextResponse.json(                                // Return a 404 Not Found.
        { error: "Load not found" },                            // JSON error message.
        { status: 404 }                                         // HTTP 404 status code.
      );
    }

    return NextResponse.json(load);                             // On success, return the load record as JSON.
  } catch (err) {                                               // If any error occurs in the try block...
    console.error("[LOAD_GET_ERROR]", err);                     // Log the error to the server console for debugging.
    return NextResponse.json(                                  // Return a generic 500 error response.
      { error: "Failed to fetch load" },                        // JSON error message.
      { status: 500 }                                           // HTTP 500 = server error.
    );
  }
}

// PUT /api/loads/:id → update an existing load.
export async function PUT(
  req: NextRequest,                                             // Incoming request containing updated load data in its JSON body.
  { params }: { params: Promise<{ id?: string }> }              // Receives route params as a Promise that includes `id`.
) {
  try {
    const { id } = await params;                                // Await params and extract the `id`.

    if (!id) {                                                  // Guard: we cannot update a load without its ID.
      return NextResponse.json(
        { error: "Load ID is required" },
        { status: 400 }
      );
    }

    const data = await req.json();                              // Parses the JSON payload from the request into a JS object.

    const updated = await db.load.update({                      // Calls Prisma to update the load row in the database.
      where: { id },                                            // Identifies which load to update using the `id`.
      data: {                                                   // Defines which fields to update.
        broker: data.broker ?? null,                            // Optional broker/customer name or null if not provided.
        rate: Number(data.rate),                                // Converts rate to a number to match the Int type in the schema.
        miles: Number(data.miles),                              // Converts miles to a number.
        fuelCost: Number(data.fuelCost),                        // Converts fuelCost to a number.
        lumper: data.lumper ? Number(data.lumper) : null,       // Optional lumper cost or null.
        tolls: data.tolls ? Number(data.tolls) : null,          // Optional tolls cost or null.
        otherCosts: data.otherCosts ? Number(data.otherCosts) : null, // Optional other costs or null.
        // customerId: data.customerId ?? null,                  // (Later) hook this up when the UI passes a customerId.
      },
    });

    return NextResponse.json(updated);                          // Returns the updated load as JSON.
  } catch (err) {
    console.error("[LOAD_UPDATE_ERROR]", err);                  // Logs the error for backend debugging.
    return NextResponse.json(
      { error: "Failed to update load" },
      { status: 500 }
    );
  }
}

// DELETE /api/loads/:id → delete a load by ID.
export async function DELETE(
  req: NextRequest,                                             // Incoming request (not used here, kept for signature consistency).
  { params }: { params: Promise<{ id?: string }> }              // Receives route params as a Promise containing `id`.
) {
  try {
    const { id } = await params;                                // Await the params Promise and extract the `id`.

    if (!id) {                                                  // Guard: cannot delete without an ID.
      return NextResponse.json(
        { error: "Load ID is required" },
        { status: 400 }
      );
    }

    await db.load.delete({                                      // Calls Prisma to delete the load with that ID.
      where: { id },                                            // Specifies which row to delete.
    });

    return NextResponse.json({ success: true });                // Returns a simple success flag if delete succeeds.
  } catch (err) {
    console.error("[LOAD_DELETE_ERROR]", err);                  // Logs any error that occurs during deletion.
    return NextResponse.json(
      { error: "Failed to delete load" },                       // Returns a 500 error if delete fails.
      { status: 500 }
    );
  }
}
