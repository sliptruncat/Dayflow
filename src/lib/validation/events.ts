import { z } from "zod";
const nullableText = (max: number) => z.string().trim().max(max).transform((value) => value || null).nullable().optional();
const iso = z.string().datetime({ offset: true });
const eventFields = z.object({ title: z.string().trim().min(1, "Введите название события.").max(240), description: nullableText(10_000), location: nullableText(240), starts_at: iso, ends_at: iso, is_all_day: z.boolean().default(false) }).strict();
export const eventCreateSchema = eventFields.refine((value) => new Date(value.ends_at) > new Date(value.starts_at), { message: "Окончание должно быть позже начала.", path: ["ends_at"] });
export const eventUpdateSchema = eventFields.partial().refine((value) => Object.keys(value).length > 0, "Передайте хотя бы одно изменение.").refine((value) => !value.starts_at || !value.ends_at || new Date(value.ends_at) > new Date(value.starts_at), { message: "Окончание должно быть позже начала.", path: ["ends_at"] });
export type EventCreate = z.infer<typeof eventCreateSchema>; export type EventUpdate = z.infer<typeof eventUpdateSchema>;
