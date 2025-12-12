import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireDemoUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ locationId?: string }> }
) {
  try {
    const { company } = await requireDemoUser();
    const { locationId } = await params;

    if (!locationId) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    }

    const location = await db.location.findFirst({
      where: { id: locationId, companyId: company.id },
      include: { contacts: true, stops: true },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json(location);
  } catch (err) {
    console.error("[LOCATION_GET_ERROR]", err);
    return NextResponse.json({ error: "Failed to fetch location" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ locationId?: string }> }
) {
  try {
    const { company } = await requireDemoUser();
    const { locationId } = await params;

    if (!locationId) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    }

    const body = await req.json();

    // Safety: only allow updating fields that exist on Location.
    const updated = await db.location.update({
      where: { id: locationId },
      data: {
        // keep company scoping enforced by checking first
        name: body.name,
        isShipper: body.isShipper,
        isReceiver: body.isReceiver,
        addressLine1: body.addressLine1 ?? null,
        addressLine2: body.addressLine2 ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        postalCode: body.postalCode ?? null,
        country: body.country ?? "US",
        shippingHours: body.shippingHours ?? null,
        notes: body.notes ?? null,
      },
    });

    // Enforce company ownership after update attempt (prevents cross-company updates if IDs collide).
    if (updated.companyId !== company.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[LOCATION_PUT_ERROR]", err);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ locationId?: string }> }
) {
  try {
    const { company } = await requireDemoUser();
    const { locationId } = await params;

    if (!locationId) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    }

    const existing = await db.location.findFirst({
      where: { id: locationId, companyId: company.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    await db.location.delete({ where: { id: locationId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[LOCATION_DELETE_ERROR]", err);
    return NextResponse.json({ error: "Failed to delete location" }, { status: 500 });
  }
}
