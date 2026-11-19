import { z } from "zod";

const nullableTrimmedText = (max: number) => z.string().trim().max(max).transform((value) => value || null).nullable().optional();
const isoDateTime = z.string().datetime({ offset: true }).nullable().optional();

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Введите название задачи.").max(240),
  description: nullableTrimmedText(10_000),
  priority: z.enum(["none", "low", "medium", "high"]).default("none"),
  deadline_at: isoDateTime,
  category_id: z.string().uuid().nullable().optional(),
  color_override: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().optional(),
  start_at: isoDateTime,
  is_all_day: z.boolean().optional(),
  estimated_minutes: z.number().int().min(1).max(10080).nullable().optional(),
}).strict();

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1, "Введите название задачи.").max(240).optional(),
  description: nullableTrimmedText(10_000),
  priority: z.enum(["none", "low", "medium", "high"]).optional(),
  deadline_at: isoDateTime,
  status: z.enum(["inbox", "planned", "in_progress", "paused", "completed", "cancelled"]).optional(),
  completed_at: isoDateTime,
  category_id: z.string().uuid().nullable().optional(),
  color_override: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().optional(),
  start_at: isoDateTime,
  is_all_day: z.boolean().optional(),
  estimated_minutes: z.number().int().min(1).max(10080).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Передайте хотя бы одно изменение.").superRefine((value, context) => {
  if (value.status === "completed" && !value.completed_at) context.addIssue({ code: "custom", message: "Для выполненной задачи требуется время завершения.", path: ["completed_at"] });
  if (value.status && value.status !== "completed" && value.completed_at) context.addIssue({ code: "custom", message: "Время завершения допустимо только для выполненной задачи.", path: ["completed_at"] });
});

export type TaskCreate = z.infer<typeof taskCreateSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;
