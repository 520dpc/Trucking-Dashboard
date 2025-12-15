import { z } from "zod";

export const DocumentSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  userId: z.string().nullable().optional(),
  loadId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  driverId: z.string().nullable().optional(),
  truckId: z.string().nullable().optional(),
  trailerId: z.string().nullable().optional(),
  fileName: z.string(),
  fileType: z.string().nullable().optional(),
  fileSize: z.number().int().nullable().optional(),
  storageKey: z.string(),
  createdAt: z.string().or(z.date()).optional(),
});

export type Document = z.infer<typeof DocumentSchema>;

export const DocumentListSchema = z.array(DocumentSchema);

export const DocumentWithSignedUrlSchema = DocumentSchema.extend({
  signedUrl: z.string(),
  expiresInSeconds: z.number().int(),
});

export type DocumentWithSignedUrl = z.infer<typeof DocumentWithSignedUrlSchema>;
