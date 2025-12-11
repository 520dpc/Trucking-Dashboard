import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/invoices/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: true,
        payments: true,
        loadLinks: {
          include: {
            load: true,
          },
        },
        emailLogs: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (err) {
    console.error("[INVOICE_GET_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      invoiceNumber,
      externalInvoiceNumber,
      issueDate,
      dueDate,
      subtotal,
      factoringFee,
      total,
      status,
      notes,
      customerId,
      lines,       // Array of { description, quantity, unitAmount }
      loadIds,     // Array of load IDs to attach to invoice
    } = body;

    // Validate existence
    const existing = await db.invoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Update invoice
    const updated = await db.invoice.update({
      where: { id },
      data: {
        invoiceNumber,
        externalInvoiceNumber,
        issueDate: issueDate ? new Date(issueDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal,
        factoringFee,
        total,
        status,
        notes,
        customerId,
      },
    });

    // Replace invoice lines
    if (Array.isArray(lines)) {
      await db.invoiceLine.deleteMany({
        where: { invoiceId: id },
      });

      for (const line of lines) {
        await db.invoiceLine.create({
          data: {
            invoiceId: id,
            description: line.description,
            quantity: line.quantity ?? 1,
            unitAmount: line.unitAmount,
            total: line.quantity * line.unitAmount,
          },
        });
      }
    }

    // Replace load associations
    if (Array.isArray(loadIds)) {
      await db.invoiceLoad.deleteMany({
        where: { invoiceId: id },
      });

      for (const loadId of loadIds) {
        await db.invoiceLoad.create({
          data: {
            invoiceId: id,
            loadId,
          },
        });
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (err) {
    console.error("[INVOICE_PUT_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/:id (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    const invoice = await db.invoice.findUnique({ where: { id } });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Soft delete functionality:
    const deleted = await db.invoice.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
    });

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error("[INVOICE_DELETE_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
