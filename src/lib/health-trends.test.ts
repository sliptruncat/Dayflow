import { describe, expect, it } from "vitest";
import { summarizeHealthEntries, type HealthTrendEntry } from "./health-trends";

describe("summarizeHealthEntries", () => {
  it("summarizes only the latest seven entries and ignores missing values", () => {
    const entries: HealthTrendEntry[] = [
      { entry_date: "2026-11-25", sleep_minutes: 480, mood: 4, energy: 3 },
      { entry_date: "2026-11-24", sleep_minutes: 420, mood: null, energy: 4 },
      { entry_date: "2026-11-23", sleep_minutes: null, mood: 5, energy: 4 },
      { entry_date: "2026-11-22", sleep_minutes: 480, mood: 3, energy: null },
      { entry_date: "2026-11-21", sleep_minutes: 360, mood: 4, energy: 3 },
      { entry_date: "2026-11-20", sleep_minutes: 540, mood: 4, energy: 5 },
      { entry_date: "2026-11-19", sleep_minutes: 420, mood: 5, energy: 4 },
      { entry_date: "2026-11-18", sleep_minutes: 1440, mood: 1, energy: 1 },
    ];
    const summary = summarizeHealthEntries(entries);
    expect(summary.count).toBe(7);
    expect(summary.recent[0].entry_date).toBe("2026-11-19");
    expect(summary.recent[6].entry_date).toBe("2026-11-25");
    expect(summary.averageSleepMinutes).toBeCloseTo(450);
    expect(summary.averageMood).toBeCloseTo(4.1666667);
    expect(summary.averageEnergy).toBeCloseTo(3.8333333);
  });

  it("returns null averages when no values were recorded", () => {
    const summary = summarizeHealthEntries([{ entry_date: "2026-11-25", sleep_minutes: null, mood: null, energy: null }]);
    expect(summary.averageSleepMinutes).toBeNull();
    expect(summary.averageMood).toBeNull();
    expect(summary.averageEnergy).toBeNull();
  });
});
