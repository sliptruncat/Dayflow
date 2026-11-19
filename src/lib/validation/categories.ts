import { z } from "zod";
const color = z.string().regex(/^#[0-9a-f]{6}$/i, "Укажите цвет в формате #RRGGBB.").transform((value) => value.toLowerCase());
export const categoryCreateSchema = z.object({ name: z.string().trim().min(1, "Введите название категории.").max(60), color }).strict();
export const categoryUpdateSchema = categoryCreateSchema.partial().refine((value) => Object.keys(value).length > 0, "Передайте изменение.");
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
