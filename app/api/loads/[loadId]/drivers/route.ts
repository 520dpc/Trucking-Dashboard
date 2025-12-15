import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoTenant } from "@/lib/demoTenant";

/**
 * GET /api/loads/:loadId/drivers
 * Returns driver assignments for a load.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ loadId?: string }> }
) {
  try {
    const { company } = await getDemoTenant();

    const { loadId } = await params;

    if (!loadId) {
      return NextResponse.json({ error: "Load ID is required" }, { status: 400 });
    }

    // Verify the load exists in THIS company (same scoping as /api/loads)
    const load = await db.load.findFirst({
      where: {
        id: loadId,
        companyId: company.id,
        isSoftDeleted: false,
      },
      select: { id: true },
    });

    if (!load) {
      return NextResponse.json({ error: "Load not found" }, { status: 404 });
    }

    const assignments = await db.loadDriver.findMany({
      where: { loadId },
      include: { driver: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json(assignments);
  } catch (err) {
    console.error("[LOAD_DRIVERS_GET_ERROR]", err);
    return NextResponse.json({ error: "Failed to fetch load drivers" }, { status: 500 });
  }
}

/**
 * POST /api/loads/:loadId/drivers
 * Body: { driverId: string, role?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ loadId?: string }> }
) {
  try {
    const { company } = await getDemoTenant();
    const { loadId } = await params;

    if (!loadId) {
      return NextResponse.json({ error: "Load ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const driverId = body?.driverId as string | undefined;
    const role = (body?.role as string | undefined) ?? null;

    if (!driverId) {
      return NextResponse.json({ error: "driverId is required" }, { status: 400 });
    }

    // Verify load belongs to company
    const load = await db.load.findFirst({
      where: { id: loadId, companyId: company.id, isSoftDeleted: false },
      select: { id: true },
    });

    if (!load) {
      return NextResponse.json({ error: "Load not found" }, { status: 404 });
    }

    // Verify driver belongs to company
    const driver = await db.driver.findFirst({
      where: { id: driverId, companyId: company.id },
      select: { id: true },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const created = await db.loadDriver.create({
      data: {
        loadId,
        driverId,
        role,
      },
      include: { driver: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[LOAD_DRIVERS_POST_ERROR]", err);
    return NextResponse.json({ error: "Failed to add driver to load" }, { status: 500 });
  }
}
