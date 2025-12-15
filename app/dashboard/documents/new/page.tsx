"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useUploadDocument } from "@/lib/hooks/useDocuments";

export default function NewDocumentPage() {
  const router = useRouter();
  const upload = useUploadDocument();

  const [file, setFile] = useState<File | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [loadId, setLoadId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please select a file.");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    if (customerId.trim()) form.append("customerId", customerId.trim());
    if (loadId.trim()) form.append("loadId", loadId.trim());

    try {
      await upload.mutateAsync(form);
      router.push("/dashboard/documents");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Failed to upload");
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Upload Document</h1>
        <Link href="/dashboard/documents" className="text-sm text-slate-600">
          Back
        </Link>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700">File</label>
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">Customer ID (optional)</label>
            <input
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="uuid"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">Load ID (optional)</label>
            <input
              value={loadId}
              onChange={(e) => setLoadId(e.target.value)}
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="uuid"
            />
          </div>
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={upload.isPending}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {upload.isPending ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
