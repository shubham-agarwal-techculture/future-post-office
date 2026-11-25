import { z } from "zod";

export const stationeryThemeSchema = z.enum([
  "plain",
  "midnight_ink",
  "rose_wax",
  "airmail",
  "botanical",
]);

export const createLetterSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
  deliver_at: z.string().datetime({ offset: true }),
  visibility: z.enum(["private", "shared"]).default("private"),
  stationery_theme: stationeryThemeSchema.default("plain"),
  recipient_emails: z
    .array(z.string().trim().email().max(320))
    .max(10)
    .default([]),
  seal: z.boolean().default(false),
});

export const updateLetterSchema = z.object({
  subject: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(1).max(20000).optional(),
  deliver_at: z.string().datetime({ offset: true }).optional(),
  visibility: z.enum(["private", "shared"]).optional(),
  stationery_theme: stationeryThemeSchema.optional(),
  seal: z.boolean().optional(),
});

export const inviteSchema = z.object({
  email: z.string().trim().email().max(320),
});

export type CreateLetterInput = z.infer<typeof createLetterSchema>;
export type UpdateLetterInput = z.infer<typeof updateLetterSchema>;
