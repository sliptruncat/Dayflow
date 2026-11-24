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

export const healthEntryFieldsSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sleep_minutes: z.number().int().min(0).max(1440).nullable().optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  notes: optionalText(3000),
}).strict();

export const healthEntrySchema = healthEntryFieldsSchema.refine((value) => value.sleep_minutes != null || value.mood != null || value.energy != null || value.notes != null, "Добавьте хотя бы один показатель.");

export const financeCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(["income", "expense"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#9aa88f"),
}).strict();

export const financeBudgetSchema = z.object({
  name: z.string().trim().min(1).max(100),
  amount: z.number().positive().max(999999999999),
  currency: z.string().regex(/^[A-Z]{3}$/).default("RUB"),
  period: z.enum(["weekly", "monthly", "yearly"]).default("monthly"),
  starts_on: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional(),
  category_id: z.string().uuid().nullable().optional(),
}).strict();

export const contactInteractionSchema = z.object({
  contact_id: z.string().uuid(),
  occurred_at: z.string().datetime().optional(),
  channel: z.enum(["note", "call", "meeting", "email", "message"]).default("note"),
  summary: z.string().trim().min(1).max(2000),
}).strict();
