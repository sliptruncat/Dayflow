import { describe, expect, it } from "vitest";
import { taskCreateSchema, taskUpdateSchema } from "./tasks";

describe("task validation", () => {
  it("accepts a durable personal task", () => {
    expect(taskCreateSchema.parse({ title: "Позвонить врачу", priority: "high", deadline_at: "2026-11-20T10:00:00.000Z" }).title).toBe("Позвонить врачу");
  });

  it("rejects empty titles and unsafe update combinations", () => {
    expect(taskCreateSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(taskUpdateSchema.safeParse({ status: "completed" }).success).toBe(false);
    expect(taskUpdateSchema.safeParse({ status: "planned", completed_at: "2026-11-20T10:00:00.000Z" }).success).toBe(false);
  });
});
