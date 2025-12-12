import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireDemoUser } from "@/lib/auth";

export async function GET() {
  try {
    const { company } = await requireDemoUser();

    const locations = await db.location.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
      include: { contacts: true },
    });

    return NextResponse.json(locations);
  } catch (err) {
    console.error("[LOCATIONS_GET_ERROR]", err);
    return NextResponse.json({ error: "Failed to load locations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { company } = await requireDemoUser();
    const body = await req.json();

    const {
      name,
      isShipper = true,
      isReceiver = true,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country = "US",
      shippingHours,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const location = await db.location.create({
      data: {
        companyId: company.id,
        name,
        isShipper,
        isReceiver,
        addressLine1: addressLine1 ?? null,
        addressLine2: addressLine2 ?? null,
        city: city ?? null,
        state: state ?? null,
        postalCode: postalCode ?? null,
        country: country ?? "US",
        shippingHours: shippingHours ?? null,
        notes: notes ?? null,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (err) {
    console.error("[LOCATIONS_POST_ERROR]", err);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}
