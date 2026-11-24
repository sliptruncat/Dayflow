import { describe, expect, it } from "vitest";
import { mergeFocusSessions, readFocusSyncSession } from "./focus-sync";

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

describe("readFocusSyncSession", () => {
  const message = {
    type: "session-updated",
    session: {
      id: "session-1",
      owner_id: "owner-a",
      started_at: "2026-11-25T09:00:00.000Z",
      duration_seconds: 1500,
      elapsed_seconds: 300,
      status: "running",
    },
  };

  it("accepts a valid session message for the current account", () => {
    expect(readFocusSyncSession(message, "owner-a")?.id).toBe("session-1");
  });

  it("rejects messages belonging to another account", () => {
    expect(readFocusSyncSession(message, "owner-b")).toBeNull();
  });

  it("rejects malformed session messages", () => {
    expect(readFocusSyncSession({ type: "session-updated", session: { id: "x", owner_id: "owner-a", status: "unknown" } }, "owner-a")).toBeNull();
  });
});
