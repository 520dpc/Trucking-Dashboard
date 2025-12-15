import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function requireDemoCompanyId() {
  let company = await db.company.findFirst({ where: { name: "Demo Company" } });
  if (!company) company = await db.company.create({ data: { name: "Demo Company" } });
  return company.id;
}

// GET /api/documents/:id -> return document + signed URL
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Document ID is required" }, { status: 400 });

    const companyId = await requireDemoCompanyId();

    const doc = await db.document.findFirst({
      where: { id, companyId },
    });

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const { data, error } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrl(doc.storageKey, 60); // 60 seconds

    if (error) {
      console.error("[SIGNED_URL_ERROR]", error);
      return NextResponse.json({ error: "Failed to create download URL" }, { status: 500 });
    }

    return NextResponse.json({
      ...doc,
      signedUrl: data.signedUrl,
      expiresInSeconds: 60,
    });
  } catch (err) {
    console.error("[DOCUMENT_GET_ERROR]", err);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

// PUT /api/documents/:id -> update metadata + links (not the file contents)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Document ID is required" }, { status: 400 });

    const companyId = await requireDemoCompanyId();
    const body = await req.json().catch(() => ({}));

    const updated = await db.document.updateMany({
      where: { id, companyId },
      data: {
        fileName: typeof body.fileName === "string" ? body.fileName : undefined,
        loadId: body.loadId === null || typeof body.loadId === "string" ? body.loadId : undefined,
        customerId:
          body.customerId === null || typeof body.customerId === "string" ? body.customerId : undefined,
        driverId:
          body.driverId === null || typeof body.driverId === "string" ? body.driverId : undefined,
        truckId: body.truckId === null || typeof body.truckId === "string" ? body.truckId : undefined,
        trailerId:
          body.trailerId === null || typeof body.trailerId === "string" ? body.trailerId : undefined,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const doc = await db.document.findFirst({ where: { id, companyId } });
    return NextResponse.json(doc);
  } catch (err) {
    console.error("[DOCUMENT_PUT_ERROR]", err);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

// DELETE /api/documents/:id -> delete from storage + delete DB record
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Document ID is required" }, { status: 400 });

    const companyId = await requireDemoCompanyId();

    const doc = await db.document.findFirst({ where: { id, companyId } });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const { error: removeError } = await supabaseAdmin.storage
      .from("documents")
      .remove([doc.storageKey]);

    if (removeError) {
      console.error("[SUPABASE_REMOVE_ERROR]", removeError);
      return NextResponse.json({ error: "Failed to delete file from storage" }, { status: 500 });
    }

    await db.document.delete({ where: { id: doc.id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DOCUMENT_DELETE_ERROR]", err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
