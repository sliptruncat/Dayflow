import { z } from "zod";

const ianaTimezoneSchema = z.string().trim().min(1).max(100).refine((timezone) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}, "Укажите действительный часовой пояс IANA.");

export const preferenceUpdateSchema = z.object({
  theme_id: z.enum(["sage", "griotte", "seafoam"]).optional(),
  locale: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).optional(),
  timezone: ianaTimezoneSchema.optional(),
  week_starts_on: z.number().int().min(0).max(6).optional(),
  time_format: z.enum(["24h", "12h"]).optional(),
  date_format: z.enum(["DD.MM.YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Нужно передать хотя бы одну настройку.");

export type PreferenceUpdate = z.infer<typeof preferenceUpdateSchema>;
