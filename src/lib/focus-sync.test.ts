import { describe, expect, it } from "vitest";
import { mergeFocusSessions } from "./focus-sync";

describe("mergeFocusSessions", () => {
  it("adds a session received from another tab and sorts newest first", () => {
    const older = { id: "older", started_at: "2026-11-24T09:00:00.000Z" };
    const newer = { id: "newer", started_at: "2026-11-25T09:00:00.000Z" };
    expect(mergeFocusSessions([older], newer)).toEqual([newer, older]);
  });

  it("updates an existing session instead of duplicating it", () => {
    const original = { id: "session", started_at: "2026-11-25T09:00:00.000Z", status: "running" };
    const updated = { ...original, status: "paused" };
    expect(mergeFocusSessions([original], updated)).toEqual([updated]);
  });
});
