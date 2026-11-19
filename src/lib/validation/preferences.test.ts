import { describe, expect, it } from "vitest";
import { preferenceUpdateSchema } from "./preferences";

describe("preference validation", () => {
  it("accepts a supported theme", () => {
    expect(preferenceUpdateSchema.parse({ theme_id: "seafoam", week_starts_on: 1 }).theme_id).toBe("seafoam");
  });

  it("rejects unknown themes and empty updates", () => {
    expect(preferenceUpdateSchema.safeParse({ theme_id: "violet" }).success).toBe(false);
    expect(preferenceUpdateSchema.safeParse({}).success).toBe(false);
  });

  it.each(["Europe/Berlin", "Europe/Moscow", "Asia/Tokyo", "UTC"])("accepts IANA timezone %s", (timezone) => {
    expect(preferenceUpdateSchema.safeParse({ timezone }).success).toBe(true);
  });

  it.each(["Invalid/Timezone", "", "arbitrary text"])("rejects invalid timezone %s", (timezone) => {
    expect(preferenceUpdateSchema.safeParse({ timezone }).success).toBe(false);
  });
});
