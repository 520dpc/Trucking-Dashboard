import { NextRequest, NextResponse } from "next/server";        // Next.js helpers for handling requests and building responses.
import { db } from "@/lib/db";                                  // Prisma client for talking to the database.
import { getDemoTenant } from "@/lib/demoTenant";               // Helper that returns the demo Company + User (temporary until real auth).

/**
 * GET /api/customers/:customerId/notes
 * Returns all call notes for a specific customer.
 */
export async function GET(
  _req: NextRequest,                                            // Incoming HTTP request (unused here).
  context: { params: Promise<{ customerId?: string }> }         // Dynamic route params; in app router they come in as a Promise.
) {
  try {
    const { company } = await getDemoTenant();                  // Get the current demo company (for multitenancy).

    const { customerId } = await context.params;                // Await params and pull out `customerId`.

    if (!customerId) {                                          // Guard: no customerId means bad request.
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    const notes = await db.callNote.findMany({                  // Query all notes for this customer.
      where: {
        customerId,                                             // Must match this customer.
        companyId: company.id,                                  // Must belong to this company.
      },
      orderBy: { createdAt: "desc" },                           // Newest notes first.
      include: {
        user: true,                                             // Include the author info so you can show who wrote it.
      },
    });

    return NextResponse.json(notes);                            // Return the list of notes as JSON.
  } catch (err) {
    console.error("[CUSTOMER_NOTES_GET_ERROR]", err);           // Log any server-side error for debugging.
    return NextResponse.json(
      { error: "Failed to fetch customer notes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers/:customerId/notes
 * Creates a new call note for a specific customer.
 *
 * Body:
 * {
 *   "content": "Called them about lanes in TX."
 * }
 */
export async function POST(
  req: NextRequest,                                             // Incoming HTTP request with JSON body.
  context: { params: Promise<{ customerId?: string }> }         // Dynamic params Promise.
) {
  try {
    const { company, user } = await getDemoTenant();            // Get demo company and current user (author of note).

    const { customerId } = await context.params;                // Await params and extract customerId.

    if (!customerId) {                                          // Guard: cannot create a note without a customer.
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();                              // Parse the request JSON payload.
    const rawContent = String(body.content ?? "").trim();       // Normalize and trim the content.

    if (!rawContent) {                                          // Guard: empty note content is not allowed.
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    // Make sure the customer actually exists for this company.
    const customer = await db.customer.findFirst({
      where: {
        id: customerId,
        companyId: company.id,
        deletedAt: null,
      },
    });

    if (!customer) {                                            // If customer not found, return 404.
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const note = await db.callNote.create({                     // Create the call note.
      data: {
        companyId: company.id,                                  // Link to company for multitenancy.
        customerId: customer.id,                                // Link to specific customer.
        userId: user.id,                                        // Author is the current demo user.
        content: rawContent,                                    // Note body.
      },
      include: {
        user: true,                                             // Include author info in the response.
      },
    });

    return NextResponse.json(note, { status: 201 });            // Return the created note with 201 Created.
  } catch (err) {
    console.error("[CUSTOMER_NOTES_POST_ERROR]", err);          // Log the error on the server.
    return NextResponse.json(
      { error: "Failed to create customer note" },
      { status: 500 }
    );
  }
}
