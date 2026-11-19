import { describe, expect, it } from "vitest";
import { eventCreateSchema } from "./events";
describe("event validation", () => { it("accepts an all-day event", () => expect(eventCreateSchema.safeParse({ title: "Отпуск", starts_at: "2026-11-20T00:00:00.000Z", ends_at: "2026-11-21T00:00:00.000Z", is_all_day: true }).success).toBe(true)); it("rejects an inverted interval", () => expect(eventCreateSchema.safeParse({ title: "Ошибка", starts_at: "2026-11-21T10:00:00.000Z", ends_at: "2026-11-21T09:00:00.000Z" }).success).toBe(false)); });
