import { describe, expect, it } from "vitest";
import { contactSchema, financeTransactionSchema, healthEntrySchema } from "./personal-modules";

describe("personal module validation", () => {
  it("accepts finance operations with a positive amount and ISO currency", () => {
    expect(financeTransactionSchema.safeParse({ title: "Groceries", amount: 120, kind: "expense", currency: "RUB" }).success).toBe(true);
    expect(financeTransactionSchema.safeParse({ title: "Invalid", amount: 0, kind: "expense" }).success).toBe(false);
  });
  it("accepts contacts without optional email and rejects invalid email", () => {
    expect(contactSchema.safeParse({ full_name: "Alex", email: "" }).success).toBe(true);
    expect(contactSchema.safeParse({ full_name: "Alex", email: "not-an-email" }).success).toBe(false);
  });
  it("validates health ranges and requires at least one entry value", () => {
    expect(healthEntrySchema.safeParse({ mood: 4, energy: 3 }).success).toBe(true);
    expect(healthEntrySchema.safeParse({ mood: 8 }).success).toBe(false);
    expect(healthEntrySchema.safeParse({}).success).toBe(false);
  });
});
