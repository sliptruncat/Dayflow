import { describe, expect, it } from "vitest";
import { calculateBudgetUsage, getBudgetWindow } from "./finance-budget";

describe("getBudgetWindow", () => {
  it("advances weekly windows in seven-day intervals", () => {
    expect(getBudgetWindow("2026-11-24", "weekly", "2026-11-30")).toEqual({
      start: "2026-11-24",
      endExclusive: "2026-12-01",
    });
    expect(getBudgetWindow("2026-11-24", "weekly", "2026-12-01")).toEqual({
      start: "2026-12-01",
      endExclusive: "2026-12-08",
    });
  });

  it("clamps monthly anniversary dates to month end", () => {
    expect(getBudgetWindow("2026-01-31", "monthly", "2026-02-27")).toEqual({
      start: "2026-01-31",
      endExclusive: "2026-02-28",
    });
    expect(getBudgetWindow("2026-01-31", "monthly", "2026-02-28")).toEqual({
      start: "2026-02-28",
      endExclusive: "2026-03-31",
    });
  });

  it("handles yearly leap-day anniversaries and future start dates", () => {
    expect(getBudgetWindow("2024-02-29", "yearly", "2025-02-28")).toEqual({
      start: "2025-02-28",
      endExclusive: "2026-02-28",
    });
    expect(getBudgetWindow("2026-12-01", "monthly", "2026-11-30")).toBeNull();
  });
});

describe("calculateBudgetUsage", () => {
  it("counts only expenses in the current period, currency and selected category", () => {
    const budget = { amount: 500, currency: "EUR", period: "monthly" as const, starts_on: "2026-11-01", category_id: "food" };
    const transactions = [
      { amount: 100, currency: "EUR", kind: "expense" as const, occurred_on: "2026-11-05", category_id: "food" },
      { amount: 50, currency: "EUR", kind: "expense" as const, occurred_on: "2026-11-10", category_id: "travel" },
      { amount: 30, currency: "USD", kind: "expense" as const, occurred_on: "2026-11-12", category_id: "food" },
      { amount: 70, currency: "EUR", kind: "income" as const, occurred_on: "2026-11-13", category_id: "food" },
      { amount: 20, currency: "EUR", kind: "expense" as const, occurred_on: "2026-12-01", category_id: "food" },
    ];
    expect(calculateBudgetUsage(budget, transactions, "2026-11-25")).toMatchObject({
      spent: 100,
      remaining: 400,
      percent: 20,
      window: { start: "2026-11-01", endExclusive: "2026-12-01" },
    });
  });
});
