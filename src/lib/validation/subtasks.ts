import { z } from "zod";

export const subtaskCreateSchema = z.object({ title: z.string().trim().min(1, "Введите название подзадачи.").max(240), position: z.number().int().min(0).optional() }).strict();
export const subtaskUpdateSchema = z.object({ title: z.string().trim().min(1).max(240).optional(), is_completed: z.boolean().optional(), completed_at: z.string().datetime({ offset: true }).nullable().optional(), position: z.number().int().min(0).optional() }).strict().refine((data) => Object.keys(data).length > 0, "Передайте изменение.").superRefine((data, context) => {
  if (data.is_completed === true && !data.completed_at) context.addIssue({ code: "custom", path: ["completed_at"], message: "Укажите время выполнения." });
  if (data.is_completed === false && data.completed_at) context.addIssue({ code: "custom", path: ["completed_at"], message: "У незавершённой подзадачи нет времени выполнения." });
});
export type SubtaskCreate = z.infer<typeof subtaskCreateSchema>;
export type SubtaskUpdate = z.infer<typeof subtaskUpdateSchema>;
