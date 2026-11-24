import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null).nullable().optional();

export const financeTransactionSchema = z.object({
  title: z.string().trim().min(1).max(180),
  amount: z.number().positive().max(999999999999),
  currency: z.string().regex(/^[A-Z]{3}$/).default("RUB"),
  kind: z.enum(["income", "expense"]),
  category_id: z.string().uuid().nullable().optional(),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  is_recurring: z.boolean().default(false),
  recurrence: z.enum(["weekly", "monthly", "yearly"]).nullable().optional(),
  notes: optionalText(2000),
}).strict();

export const contactSchema = z.object({
  full_name: z.string().trim().min(1).max(160),
  company: optionalText(160),
  role: optionalText(120),
  email: z.preprocess((value) => value === "" ? null : value, z.string().trim().email().max(254).nullable().optional()),
  phone: optionalText(40),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: optionalText(5000),
}).strict();

export const healthEntrySchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sleep_minutes: z.number().int().min(0).max(1440).nullable().optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  notes: optionalText(3000),
}).strict().refine((value) => value.sleep_minutes != null || value.mood != null || value.energy != null || value.notes != null, "Добавьте хотя бы один показатель.");
