import { NextRequest, NextResponse } from "next/server";        // Next.js request/response helpers.
import { db } from "@/lib/db";                                  // Prisma client.
import { getDemoTenant } from "@/lib/demoTenant";               // Demo company+user helper.

/**
 * GET /api/customers/:customerId/notes/:noteId
 * Fetch a single call note by ID, scoped to company + (optionally) customer.
 */
export async function GET(
  _req: NextRequest,                                            // Incoming request (unused).
  context: {
    params: Promise<{ customerId?: string; noteId?: string }>;  // Dynamic params Promise with both customerId and noteId.
  }
) {
  try {
    const { company } = await getDemoTenant();                  // Get current company.

    const { customerId, noteId } = await context.params;        // Await params and destructure.
    if (!noteId) {                                              // Note ID is required.
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 }
      );
    }

    const note = await db.callNote.findFirst({                  // Look up the note.
      where: {
        id: noteId,                                             // Must match this note.
        companyId: company.id,                                  // Must belong to this company.
        ...(customerId ? { customerId } : {}),                  // If a customerId is present in the route, enforce it too.
      },
      include: {
        user: true,                                             // Include author info.
        customer: true,                                         // Include customer info.
      },
    });

    if (!note) {                                                // If nothing found, return 404.
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(note);                             // Return the note JSON.
  } catch (err) {
    console.error("[CUSTOMER_NOTE_GET_ERROR]", err);            // Log server-side error.
    return NextResponse.json(
      { error: "Failed to fetch note" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customers/:customerId/notes/:noteId
 * Hard-deletes a call note.
 */
export async function DELETE(
  _req: NextRequest,                                            // Incoming request (unused).
  context: {
    params: Promise<{ customerId?: string; noteId?: string }>;  // Dynamic params Promise.
  }
) {
  try {
    const { company } = await getDemoTenant();                  // Get current company.

    const { customerId, noteId } = await context.params;        // Await and destructure params.
    if (!noteId) {                                              // Must have noteId to delete.
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 }
      );
    }

    const result = await db.callNote.deleteMany({               // Delete any matching note(s).
      where: {
        id: noteId,                                             // Match this note ID.
        companyId: company.id,                                  // Ensure it belongs to this company.
        ...(customerId ? { customerId } : {}),                  // Optionally also enforce customerId.
      },
    });

    if (result.count === 0) {                                   // Nothing deleted → not found.
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });                // Success response for the client.
  } catch (err) {
    console.error("[CUSTOMER_NOTE_DELETE_ERROR]", err);         // Log the error details.
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
