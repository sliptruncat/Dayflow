import { z } from "zod";
export const preferenceUpdateSchema = z.object({
  theme_id: z.enum(["sage", "griotte", "seafoam"]).optional(),
  locale: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  week_starts_on: z.number().int().min(0).max(6).optional(),
  time_format: z.enum(["24h", "12h"]).optional(),
  date_format: z.enum(["DD.MM.YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Нужно передать хотя бы одно настройку.");

export type PreferenceUpdate = z.infer<typeof preferenceUpdateSchema>;
