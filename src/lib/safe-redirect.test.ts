import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "./safe-redirect";

describe("getSafeRedirectPath", () => {
  it("allows internal paths with query and hash", () => {
    expect(getSafeRedirectPath("/calendar?date=2026-11-19#today")).toBe("/calendar?date=2026-11-19#today");
  });
  it("rejects external and protocol-relative URLs", () => {
    expect(getSafeRedirectPath("https://evil.example")).toBe("/");
    expect(getSafeRedirectPath("//evil.example")).toBe("/");
    expect(getSafeRedirectPath("/\\\\evil.example")).toBe("/");
  });
  it("rejects encoded slash and backslash ambiguity", () => {
    expect(getSafeRedirectPath("/%2f%2fevil.example")).toBe("/");
    expect(getSafeRedirectPath("/%5cevil.example")).toBe("/");
  });
  it("supports a caller-provided fallback", () => {
    expect(getSafeRedirectPath(null, "/calendar")).toBe("/calendar");
  });
});
