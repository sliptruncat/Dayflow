import { describe, expect, it, vi } from "vitest";
import { getPreferences, updatePreferences } from "./preference-repository";

function clientWith(result: { data: unknown; error: unknown }, created?: { data: unknown; error: unknown }) {
  const update = vi.fn();
  const insert = vi.fn();
  const builder = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), single: vi.fn() };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.maybeSingle.mockResolvedValue(result);
  builder.single.mockResolvedValue(created ?? result);
  update.mockReturnValue(builder);
  insert.mockReturnValue(builder);
  return { client: { from: vi.fn(() => ({ select: builder.select, update, insert })) } as never, update, insert };
}

describe("preferences repository", () => {
  it("returns null for a missing preference row without masking a database error", async () => {
    const { client } = clientWith({ data: null, error: null });
    await expect(getPreferences(client, "owner")).resolves.toBeNull();
  });

  it("creates safe defaults when an existing account updates missing preferences", async () => {
    const { client, insert } = clientWith({ data: null, error: null }, { data: { owner_id: "owner", theme_id: "seafoam" }, error: null });
    await expect(updatePreferences(client, "owner", { theme_id: "seafoam" })).resolves.toMatchObject({ theme_id: "seafoam" });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: "owner", theme_id: "seafoam", timezone: "UTC" }));
  });
});
