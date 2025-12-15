import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function requireDemoContext() {
  // Company
  let company = await db.company.findFirst({ where: { name: "Demo Company" } });
  if (!company) {
    company = await db.company.create({ data: { name: "Demo Company" } });
  }

  // User
  let user = await db.user.findFirst({ where: { email: "demo@demo.com" } });
  if (!user) {
    user = await db.user.create({
      data: {
        email: "demo@demo.com",
        passwordHash: "placeholder",
        companyId: company.id,
        role: "OWNER",
        fullName: "Demo User",
      },
    });
  }

  return { user, company };
}

function safeExtFromName(name: string) {
  const parts = name.split(".");
  if (parts.length < 2) return "bin";
  const ext = parts.pop()?.toLowerCase() ?? "bin";
  return ext.replace(/[^a-z0-9]/g, "") || "bin";
}

// GET /api/documents -> list documents (demo company only for now)
export async function GET() {
  try {
    const { company } = await requireDemoContext();

    const docs = await db.document.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(docs);
  } catch (err) {
    console.error("[DOCUMENTS_GET_ERROR]", err);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

// POST /api/documents -> upload file to Supabase + create Document row
export async function POST(req: NextRequest) {
  try {
    const { user, company } = await requireDemoContext();

    const form = await req.formData();

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required (multipart/form-data)" }, { status: 400 });
    }

    const loadId = (form.get("loadId") as string | null) ?? null;
    const customerId = (form.get("customerId") as string | null) ?? null;
    const driverId = (form.get("driverId") as string | null) ?? null;
    const truckId = (form.get("truckId") as string | null) ?? null;
    const trailerId = (form.get("trailerId") as string | null) ?? null;

    // Build storage key (stable + avoids collisions)
    const ext = safeExtFromName(file.name);
    const storageKey = `company/${company.id}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(storageKey, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("[SUPABASE_UPLOAD_ERROR]", uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    const doc = await db.document.create({
      data: {
        companyId: company.id,
        userId: user.id,
        loadId,
        customerId,
        driverId,
        truckId,
        trailerId,
        fileName: file.name,
        fileType: file.type || null,
        fileSize: file.size ?? null,
        storageKey,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error("[DOCUMENTS_POST_ERROR]", err);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
