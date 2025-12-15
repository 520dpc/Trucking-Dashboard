"use client";

import Link from "next/link";
import { useDocuments, useDeleteDocument } from "@/lib/hooks/useDocuments";
import { getDocument } from "@/lib/api/documents";

export default function DocumentsPage() {
  const { data, isLoading, error } = useDocuments();
  const del = useDeleteDocument();

  async function handleDownload(id: string) {
    const doc = await getDocument(id);
    window.open(doc.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <Link
          href="/dashboard/documents/new"
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white"
        >
          Upload Document
        </Link>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && (
        <p className="text-sm text-rose-600">
          {(error as any)?.message ?? "Failed to load documents"}
        </p>
      )}

      {!isLoading && data?.length === 0 && (
        <p className="text-sm text-slate-500">No documents yet.</p>
      )}

      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left">File</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Size</th>
                <th className="px-4 py-2 text-left">Created</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-4 py-2">{d.fileName}</td>
                  <td className="px-4 py-2">{d.fileType ?? "-"}</td>
                  <td className="px-4 py-2">
                    {typeof d.fileSize === "number" ? `${d.fileSize} bytes` : "-"}
                  </td>
                  <td className="px-4 py-2">
                    {d.createdAt ? new Date(d.createdAt as any).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-2 flex gap-2">
                    <button
                      onClick={() => handleDownload(d.id)}
                      className="rounded-md border px-2 py-1 text-xs"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => del.mutate(d.id)}
                      disabled={del.isPending}
                      className="rounded-md border px-2 py-1 text-xs text-rose-600 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
