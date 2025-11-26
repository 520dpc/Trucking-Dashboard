import { NextRequest, NextResponse } from "next/server";        // Imports Next.js helpers for handling requests and building JSON responses.
import { db } from "@/lib/db";                                  // Imports the Prisma client so we can query and modify the database.

// GET /api/customers/:id → fetch a single customer by ID (including call notes).
export async function GET(
  req: NextRequest,                                             // Incoming HTTP request (not used here, but part of the handler signature).
  { params }: { params: Promise<{ id?: string }> }              // Next.js passes `params` as a Promise; we must await it to get the id.
) {
  try {                                                         // Wrap logic in try/catch to handle errors gracefully.
    const { id } = await params;                                // Awaits the params Promise and destructures the `id` value.

    if (!id) {                                                  // If id is missing or undefined...
      return NextResponse.json(                                // Return a 400 Bad Request response.
        { error: "Customer ID is required" },                   // JSON message explaining the issue.
        { status: 400 }                                         // HTTP 400 = client input error.
      );
    }

    const customer = await db.customer.findUnique({             // Queries the Customer table for a single row.
      where: { id },                                            // Uses the id from the URL to find the customer.
      include: {                                                // Includes related tables in the result.
        callNotes: true,                                        // Also fetches all call notes for this customer.
      },
    });

    if (!customer) {                                            // If Prisma didn’t find any customer with that ID...
      return NextResponse.json(                                // Return a 404 Not Found response.
        { error: "Customer not found" },                        // JSON error message.
        { status: 404 }                                         // HTTP 404 = resource not found.
      );
    }

    return NextResponse.json(customer);                         // On success, return the full customer object (including callNotes).
  } catch (err) {                                               // If any error is thrown inside the try block...
    console.error("[CUSTOMER_GET_ERROR]", err);                 // Log the error to the server console for debugging.
    return NextResponse.json(                                  // Send a generic 500 error response.
      { error: "Failed to fetch customer" },                    // JSON message indicating failure.
      { status: 500 }                                           // HTTP 500 = internal server error.
    );
  }
}

// PUT /api/customers/:id → update an existing customer.
export async function PUT(
  req: NextRequest,                                             // Incoming request containing JSON body with updated customer fields.
  { params }: { params: Promise<{ id?: string }> }              // Receives params as a Promise; must be awaited to get the id.
) {
  try {
    const { id } = await params;                                // Awaits params and extracts the id.

    if (!id) {                                                  // Guard: no id means invalid request.
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    const data = await req.json();                              // Parses the JSON payload from the request into a JavaScript object.

    const updated = await db.customer.update({                  // Uses Prisma to update the customer row.
      where: { id },                                            // Chooses which row to update based on the id.
      data: {                                                   // Defines which fields to update.
        name: data.name,                                        // Updated customer name (required).
        type: data.type ?? null,                                // Updated type or null if omitted.
        mcNumber: data.mcNumber ?? null,                        // Updated MC number or null.
        email: data.email ?? null,                              // Updated email or null.
        phone: data.phone ?? null,                              // Updated phone or null.
        notes: data.notes ?? null,                              // Updated general notes or null.
      },
    });

    return NextResponse.json(updated);                          // Returns the updated customer object as JSON.
  } catch (err) {                                               // If anything goes wrong during update...
    console.error("[CUSTOMER_UPDATE_ERROR]", err);              // Log the error to the backend console.
    return NextResponse.json(                                  // Return a 500 error response to the client.
      { error: "Failed to update customer" },                   // JSON message describing the failure.
      { status: 500 }                                           // HTTP 500 = internal server error.
    );
  }
}

// DELETE /api/customers/:id → delete a customer by ID.
export async function DELETE(
  req: NextRequest,                                             // Incoming request (not used; included to match handler signature).
  { params }: { params: Promise<{ id?: string }> }              // Receives route parameters as a Promise.
) {
  try {
    const { id } = await params;                                // Awaits params and extracts the id.

    if (!id) {                                                  // Guard: if id is missing, the request is invalid.
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    await db.customer.delete({                                  // Uses Prisma to delete the customer row.
      where: { id },                                            // Specifies which row to delete based on the id.
    });

    return NextResponse.json({ success: true });                // Returns a simple success flag on successful deletion.
  } catch (err) {                                               // If deletion fails...
    console.error("[CUSTOMER_DELETE_ERROR]", err);              // Log the error message and stack for debugging.
    return NextResponse.json(                                  // Return a 500 error response.
      { error: "Failed to delete customer" },                   // JSON error message for the client.
      { status: 500 }                                           // HTTP 500 = server-side error.
    );
  }
}
