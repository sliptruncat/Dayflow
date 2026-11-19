import { describe, expect, it } from "vitest";
import { dateKeyInTimeZone, eventsByDate, monthGrid, shiftMonth, tasksByDeadline, weekKeys, yearMonths, zonedDateTimeToIso } from "./calendar-month";

describe("month calendar", () => {
  it("starts Monday grid correctly and includes trailing month days", () => {
    const grid = monthGrid(2026, 10);
    expect(grid).toHaveLength(42);
    expect(grid[0]).toMatchObject({ key: "2026-10-26", inMonth: false });
    expect(grid[6]).toMatchObject({ key: "2026-11-01", inMonth: true });
    expect(grid[41]).toMatchObject({ key: "2026-12-06", inMonth: false });
  });

  it("moves across year boundaries", () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });
  it("builds a Monday-first week and all twelve year months", () => {
    expect(weekKeys("2026-11-19")).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]);
    expect(yearMonths(2026)).toHaveLength(12);
    expect(yearMonths(2026)[1].days).toHaveLength(28);
  });

  it("groups deadlines by the user timezone without UTC date drift", () => {
    const tasks = [{ deadline_at: "2026-11-01T00:30:00.000Z", name: "A" }, { deadline_at: null, name: "B" }];
    expect(dateKeyInTimeZone(tasks[0].deadline_at!, "Europe/Moscow")).toBe("2026-11-01");
    expect(tasksByDeadline(tasks, "Europe/Moscow")["2026-11-01"]).toHaveLength(1);
  });

  it("keeps a selected calendar date in the profile timezone", () => {
    const deadline = zonedDateTimeToIso("2026-01-01T12:00", "Pacific/Kiritimati");
    expect(dateKeyInTimeZone(deadline!, "Pacific/Kiritimati")).toBe("2026-01-01");
  });
  it("places all-day and midnight-crossing events on their calendar days", () => {
    const events = [{ starts_at: "2026-11-01T21:00:00.000Z", ends_at: "2026-11-02T02:00:00.000Z", is_all_day: false }, { starts_at: "2026-11-03T00:00:00.000Z", ends_at: "2026-11-04T00:00:00.000Z", is_all_day: true }];
    const grouped = eventsByDate(events, "UTC");
    expect(grouped["2026-11-01"]).toHaveLength(1); expect(grouped["2026-11-02"]).toHaveLength(1); expect(grouped["2026-11-03"]).toHaveLength(1); expect(grouped["2026-11-04"]).toBeUndefined();
  });
});
