import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ customerId?: string }>;
};

// GET /api/customers/:customerId/contacts → list contacts for that customer
export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { customerId } = await context.params;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Make sure the customer exists (and get its companyId if we ever need it)
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const contacts = await db.contact.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(contacts);
  } catch (err) {
    console.error("[CUSTOMER_CONTACTS_GET_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

// POST /api/customers/:customerId/contacts → create a new contact
export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { customerId } = await context.params;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const rawName = String(body.name ?? "").trim();

    if (!rawName) {
      return NextResponse.json(
        { error: "Contact name is required" },
        { status: 400 }
      );
    }

    // Get the customer so we can also attach the correct companyId
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const contact = await db.contact.create({
      data: {
        companyId: customer.companyId,
        customerId: customer.id,
        name: rawName,
        role: body.role ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    console.error("[CUSTOMER_CONTACTS_POST_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
