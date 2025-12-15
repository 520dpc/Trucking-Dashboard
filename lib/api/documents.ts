import { apiRequest } from "./client";
import {
  DocumentListSchema,
  DocumentSchema,
  DocumentWithSignedUrlSchema,
  type Document,
  type DocumentWithSignedUrl,
} from "@/lib/schemas/documents";

type UpdateDocumentInput = Partial<{
  fileName: string;
  loadId: string | null;
  customerId: string | null;
  driverId: string | null;
  truckId: string | null;
  trailerId: string | null;
}>;

export async function listDocuments(): Promise<Document[]> {
  const data = await apiRequest<unknown>("/api/documents");
  return DocumentListSchema.parse(data);
}

export async function uploadDocument(form: FormData): Promise<Document> {
  const data = await apiRequest<unknown>("/api/documents", {
    method: "POST",
    body: form,
  });
  return DocumentSchema.parse(data);
}

export async function getDocument(id: string): Promise<DocumentWithSignedUrl> {
  const data = await apiRequest<unknown>(`/api/documents/${id}`);
  return DocumentWithSignedUrlSchema.parse(data);
}

export async function updateDocument(
  id: string,
  input: UpdateDocumentInput
): Promise<Document> {
  const data = await apiRequest<unknown>(`/api/documents/${id}`, {
    method: "PUT",
    body: input,
  });
  return DocumentSchema.parse(data);
}

export async function deleteDocument(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/documents/${id}`, {
    method: "DELETE",
  });
}
