import { describe, expect, it, vi } from "vitest";
import { createEvent, deleteEvent, updateEvent } from "./event-repository";

function fakeClient(result: unknown) {
  const builder = { insert: vi.fn(), update: vi.fn(), delete: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(), maybeSingle: vi.fn() };
  builder.insert.mockReturnValue(builder); builder.update.mockReturnValue(builder); builder.delete.mockReturnValue(builder); builder.eq.mockReturnValue(builder); builder.select.mockReturnValue(builder); builder.single.mockResolvedValue({ data: result, error: null }); builder.maybeSingle.mockResolvedValue({ data: result, error: null });
  return { from: vi.fn(() => builder), builder };
}

const input = { title: "Встреча", starts_at: "2026-11-20T09:00:00.000Z", ends_at: "2026-11-20T10:00:00.000Z", is_all_day: false };

describe("event repository", () => {
  it("creates an owner-scoped event", async () => { const { from, builder } = fakeClient({ id: "event", ...input }); await createEvent({ from } as never, "owner", input); expect(from).toHaveBeenCalledWith("calendar_events"); expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: "owner", title: "Встреча" })); });
  it("edits and deletes only an owner-scoped event", async () => { const { from, builder } = fakeClient({ id: "event", ...input }); await updateEvent({ from } as never, "owner", "event", { title: "Новое имя" }); expect(builder.eq).toHaveBeenCalledWith("owner_id", "owner"); await deleteEvent({ from } as never, "owner", "event"); expect(builder.delete).toHaveBeenCalled(); });
});
