import { z } from "zod";

export const profileUpdateSchema = z.object({
  display_name: z.string().trim().min(1).max(80).nullable().optional(),
  avatar_url: z.string().url().refine((value) => value.startsWith("https://") || value.startsWith("http://"), "Нужен HTTP(S) URL.").nullable().optional(),
  locale: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
}).strict();

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
