import { NextRequest, NextResponse } from "next/server";        // Provides types and helpers for handling API requests and building responses.
import { db } from "@/lib/db";                                  // Imports the Prisma client instance so we can talk to the database.

// GET /api/customers/:id/notes  → list notes for a customer.
export async function GET(
  req: NextRequest,                                             // Incoming HTTP request (not used here, but required by the handler signature).
  { params }: { params: Promise<{ id?: string; customerId?: string }> } // Next.js passes route params as a Promise in your environment.
) {
  try {                                                         // Wrap in try/catch so a thrown error doesn't crash the route.
    const resolvedParams = await params;                        // Awaits the params Promise and gets the actual object with path parameters.
    const customerId = resolvedParams.customerId ?? resolvedParams.id ?? null; // Pulls customerId from either `customerId` or `id`, depending on folder name.

    if (!customerId) {                                          // If we still don't have an ID, the client called the route incorrectly.
      return NextResponse.json(
        { error: "Customer ID is required" },                   // Sends a clear error message back.
        { status: 400 }                                         // HTTP 400 = bad request.
      );
    }

    const notes = await db.callNote.findMany({                  // Queries the CallNote table for all notes tied to this customer.
      where: { customerId },                                    // Filters notes by the derived customerId.
      orderBy: { createdAt: "desc" },                           // Orders notes newest first for a more natural timeline.
    });

    return NextResponse.json(notes);                            // Returns the array of notes as JSON to the client.
  } catch (err) {
    console.error("[CUSTOMER_NOTES_GET_ERROR]", err);           // Logs any unexpected errors to the server console for debugging.
    return NextResponse.json(
      { error: "Failed to fetch customer notes" },              // Generic error message for the client.
      { status: 500 }                                           // HTTP 500 = server error.
    );
  }
}

// POST /api/customers/:id/notes  → create a new note for a customer.
export async function POST(
  req: NextRequest,                                             // Incoming HTTP request containing the JSON body with note content.
  { params }: { params: Promise<{ id?: string; customerId?: string }> } // Route params Promise containing the dynamic segment.
) {
  try {
    const resolvedParams = await params;                        // Awaits the params Promise to get the actual parameters object.
    const customerId = resolvedParams.customerId ?? resolvedParams.id ?? null; // Pulls the customerId from either `customerId` or `id`.

    if (!customerId) {                                          // Guard: if no ID, we can't create a note.
      return NextResponse.json(
        { error: "Customer ID is required" },                   // Explain the issue to the client.
        { status: 400 }                                         // HTTP 400 = bad client input.
      );
    }

    const data = await req.json();                              // Parses the JSON request body into a plain JS object.

    if (!data.content || typeof data.content !== "string") {    // Validates that `content` exists and is a string.
      return NextResponse.json(
        { error: "Note content is required" },                  // Error message for missing or invalid content.
        { status: 400 }                                         // HTTP 400 = client error.
      );
    }

    // TEMP auth: ensure the demo user exists until real auth is added.
    let user = await db.user.findFirst({                        // Looks for the demo user row in the User table.
      where: { email: "demo@demo.com" },                        // Uses the fixed demo email.
    });

    if (!user) {                                                // If no demo user exists yet...
      user = await db.user.create({                             // Create it now so we always have a valid user to attach notes to.
        data: {
          email: "demo@demo.com",                               // Demo email address.
          passwordHash: "placeholder",                          // Placeholder hash until real auth is wired in.
        },
      });
    }

    const note = await db.callNote.create({                     // Creates a new CallNote row in the database.
      data: {
        content: data.content,                                  // Stores the note text in the `content` field (matches your Prisma model).
        user: {                                                 // Connects this note to the demo user via relation.
          connect: { id: user.id },                             // Uses the user's ID to create the relation.
        },
        customer: {                                             // Connects this note to the Customer via relation.
          connect: { id: customerId },                          // Uses the derived customerId to create the relation.
        },
      },
    });

    return NextResponse.json(note, { status: 201 });            // Returns the created note and uses HTTP 201 Created status.
  } catch (err) {
    console.error("[CUSTOMER_NOTES_POST_ERROR]", err);          // Logs any Prisma or runtime error for debugging.
    return NextResponse.json(
      { error: "Failed to create customer note" },              // Generic error payload for the client.
      { status: 500 }                                           // HTTP 500 = server-side failure.
    );
  }
}
