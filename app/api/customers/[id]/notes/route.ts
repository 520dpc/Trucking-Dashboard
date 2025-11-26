import { NextRequest, NextResponse } from "next/server";                            // Imports helpers for handling requests and building responses.
import { db } from "@/lib/db";                                                      // Imports the Prisma client to talk to the database.

// GET /api/customers/:id/notes → list notes for a single customer.
export async function GET(
  req: NextRequest,                                                                 // Incoming HTTP request (not used here).
  context: { params: { id: string } }                                              // Contains the dynamic :id route segment (customer ID).
) {
  try {                                                                             // Wrap DB call in try/catch to avoid crashing on errors.
    const customerId = context.params.id;                                           // Pulls the customer ID from the route params.

    const notes = await db.callNote.findMany({                                     // Prisma query to fetch all notes for this customer.
      where: { customerId },                                                        // Filters by the given customer ID.
      orderBy: { createdAt: "desc" },                                               // Sorts notes by newest first for a timeline-style UI.
      include: {                                                                    // Also load related records.
        user: {                                                                     // Include the user who wrote each note.
          select: { id: true, email: true },                                        // Only attach the fields we need from User (id + email).
        },
      },
    });

    return NextResponse.json(notes);                                                // Return the list of notes (with user info) as JSON.
  } catch (err) {
    console.error("[CUSTOMER_NOTES_GET_ERROR]", err);                               // Log error to server console for debugging.
    return NextResponse.json(                                                      // Return error response if something goes wrong.
      { error: "Failed to fetch customer notes" },                                  // Error payload for client.
      { status: 500 }                                                               // HTTP 500 indicates server-side error.
    );
  }
}

// POST /api/customers/:id/notes → create a new note for a customer.
export async function POST(
  req: NextRequest,                                                                 // Incoming HTTP request that includes note content in JSON body.
  context: { params: { id: string } }                                              // Route params with the target customer ID.
) {
  try {
    const customerId = context.params.id;                                           // Extracts the customer ID from the URL.
    const data = await req.json();                                                 // Parses the JSON body to get the note data.

    // TEMP AUTH: use demo user until real auth is implemented.
    let user = await db.user.findFirst({                                           // Look up demo user in DB.
      where: { email: "demo@demo.com" },                                           // Matches the fixed demo email.
    });

    if (!user) {                                                                   // If demo user doesn't exist...
      user = await db.user.create({                                                // Create a new demo user record.
        data: {
          email: "demo@demo.com",                                                  // Demo email placeholder.
          passwordHash: "placeholder",                                             // Placeholder hash until auth is implemented.
        },
      });
    }

    const note = await db.callNote.create({                                        // Create a new CallNote record in the database.
      data: {
        userId: user.id,                                                           // Associate note with the demo user's ID.
        customerId,                                                                // Link the note to the given customer ID.
        content: data.content,                                                     // Store the text content of the note.
      },
      include: {
        user: {                                                                    // Include user info in the response.
          select: { id: true, email: true },                                       // Only return id and email for brevity.
        },
      },
    });

    return NextResponse.json(note, { status: 201 });                               // Return created note with 201 Created status.
  } catch (err) {
    console.error("[CUSTOMER_NOTES_POST_ERROR]", err);                             // Log any errors which occurred during creation.
    return NextResponse.json(                                                      // Return JSON error response.
      { error: "Failed to create customer note" },                                 // Error message payload.
      { status: 500 }                                                              // HTTP 500 for server-side error.
    );
  }
}
