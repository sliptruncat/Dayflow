import { describe, expect, it } from "vitest";
import { isThemeId } from "./themes";

describe("theme validation", () => {
  it("accepts only registered DAYFLOW themes", () => {
    expect(isThemeId("sage")).toBe(true);
    expect(isThemeId("untrusted-theme")).toBe(false);
    expect(isThemeId(null)).toBe(false);
  });
});
