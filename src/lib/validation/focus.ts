import { z } from "zod";

export const focusCreateSchema = z.object({
  duration_seconds: z.number().int().min(60).max(14400),
  task_id: z.string().uuid().nullable().optional(),
}).strict();

export const focusUpdateSchema = z.object({
  elapsed_seconds: z.number().int().min(0).optional(),
  status: z.enum(["running", "paused", "completed", "cancelled"]).optional(),
  completed_at: z.string().datetime({ offset: true }).nullable().optional(),
  started_at: z.string().datetime({ offset: true }).optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export type FocusCreate = z.infer<typeof focusCreateSchema>;
export type FocusUpdate = z.infer<typeof focusUpdateSchema>;
