import { NextRequest, NextResponse } from "next/server"; // Next request/response helpers so we can implement GET/PUT/DELETE handlers.
import { db } from "@/lib/db"; // Prisma client so we can query Load + LoadDriver tables.
import { getDemoTenant } from "@/lib/demoTenant"; // Demo tenant helper so we scope reads/writes to one company consistently.

// GET /api/loads/:loadId/drivers/:assignmentId → fetch one driver assignment for a load.
export async function GET(
  _req: NextRequest, // Incoming request (unused) but required by signature.
  { params }: { params: Promise<{ loadId?: string; assignmentId?: string }> } // Next passes params as a Promise; must be awaited.
) {
  try {
    const { company } = await getDemoTenant(); // Gets the demo company so we can enforce multi-tenant scoping.
    const { loadId, assignmentId } = await params; // Awaits params and extracts both IDs from the URL.

    if (!loadId) { // Guard against missing loadId in the URL.
      return NextResponse.json({ error: "Load ID is required" }, { status: 400 }); // 400 because client request is malformed.
    }

    if (!assignmentId) { // Guard against missing assignmentId in the URL.
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 }); // 400 because client request is malformed.
    }

    const load = await db.load.findFirst({ // Verifies the load exists AND belongs to this company.
      where: { id: loadId, companyId: company.id, isSoftDeleted: false }, // Scope by company + ignore soft deleted loads.
      select: { id: true }, // Only need the id to confirm existence.
    });

    if (!load) { // If the scoped load check fails...
      return NextResponse.json({ error: "Load not found" }, { status: 404 }); // 404 because the resource isn't visible in this tenant.
    }

    const assignment = await db.loadDriver.findFirst({ // Fetches the assignment, ensuring it belongs to the load.
      where: { id: assignmentId, loadId }, // Ties the assignment to the given loadId for safety.
      include: { driver: true }, // Includes driver so the client has display info without a second request.
    });

    if (!assignment) { // If no assignment found for that ID under that load...
      return NextResponse.json({ error: "Driver assignment not found" }, { status: 404 }); // 404 not found.
    }

    return NextResponse.json(assignment); // Returns the assignment as JSON.
  } catch (err) {
    console.error("[LOAD_DRIVER_GET_ERROR]", err); // Logs the error to server console for debugging.
    return NextResponse.json({ error: "Failed to fetch driver assignment" }, { status: 500 }); // 500 for server-side failure.
  }
}

// PUT /api/loads/:loadId/drivers/:assignmentId → update the role (or other editable fields later).
export async function PUT(
  req: NextRequest, // Request containing JSON body.
  { params }: { params: Promise<{ loadId?: string; assignmentId?: string }> } // Params promise containing IDs.
) {
  try {
    const { company } = await getDemoTenant(); // Gets company for scoping.
    const { loadId, assignmentId } = await params; // Extract ids from URL.
    const body = await req.json(); // Parse JSON body.

    if (!loadId) { // Guard missing loadId.
      return NextResponse.json({ error: "Load ID is required" }, { status: 400 }); // 400 malformed request.
    }

    if (!assignmentId) { // Guard missing assignmentId.
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 }); // 400 malformed request.
    }

    const load = await db.load.findFirst({ // Confirms load belongs to tenant before allowing update.
      where: { id: loadId, companyId: company.id, isSoftDeleted: false }, // Scope by tenant.
      select: { id: true }, // Only need to confirm existence.
    });

    if (!load) { // If load doesn't exist in tenant...
      return NextResponse.json({ error: "Load not found" }, { status: 404 }); // 404.
    }

    const existing = await db.loadDriver.findFirst({ // Confirms assignment belongs to this load.
      where: { id: assignmentId, loadId }, // Must match both to prevent cross-load edits.
      select: { id: true }, // Only need to confirm existence.
    });

    if (!existing) { // If assignment isn't found under this load...
      return NextResponse.json({ error: "Driver assignment not found" }, { status: 404 }); // 404.
    }

    const updated = await db.loadDriver.update({ // Updates the assignment.
      where: { id: assignmentId }, // Update by unique ID.
      data: {
        role: body.role ?? null, // Updates role; allows null to clear.
      },
      include: { driver: true }, // Return driver for UI convenience.
    });

    return NextResponse.json(updated); // Returns updated assignment.
  } catch (err) {
    console.error("[LOAD_DRIVER_UPDATE_ERROR]", err); // Logs update error.
    return NextResponse.json({ error: "Failed to update driver assignment" }, { status: 500 }); // 500.
  }
}

// DELETE /api/loads/:loadId/drivers/:assignmentId → remove driver from load.
export async function DELETE(
  _req: NextRequest, // Request not used.
  { params }: { params: Promise<{ loadId?: string; assignmentId?: string }> } // Params promise containing IDs.
) {
  try {
    const { company } = await getDemoTenant(); // Tenant scope.
    const { loadId, assignmentId } = await params; // Extract ids.

    if (!loadId) { // Guard missing loadId.
      return NextResponse.json({ error: "Load ID is required" }, { status: 400 }); // 400.
    }

    if (!assignmentId) { // Guard missing assignmentId.
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 }); // 400.
    }

    const load = await db.load.findFirst({ // Confirms load belongs to this company.
      where: { id: loadId, companyId: company.id, isSoftDeleted: false }, // Tenant-scoped load check.
      select: { id: true }, // Only confirming existence.
    });

    if (!load) { // If load isn't in this tenant...
      return NextResponse.json({ error: "Load not found" }, { status: 404 }); // 404.
    }

    const existing = await db.loadDriver.findFirst({ // Confirms assignment belongs to this load.
      where: { id: assignmentId, loadId }, // Must match both.
      select: { id: true }, // Confirm existence only.
    });

    if (!existing) { // If assignment doesn't exist...
      return NextResponse.json({ error: "Driver assignment not found" }, { status: 404 }); // 404.
    }

    await db.loadDriver.delete({ where: { id: assignmentId } }); // Deletes the assignment by unique ID.

    return NextResponse.json({ success: true }); // Returns success response.
  } catch (err) {
    console.error("[LOAD_DRIVER_DELETE_ERROR]", err); // Logs delete error.
    return NextResponse.json({ error: "Failed to delete driver assignment" }, { status: 500 }); // 500.
  }
}
