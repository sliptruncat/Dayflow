import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicEnvironment } from "./env";

afterEach(() => vi.unstubAllEnvs());

describe("public environment", () => {
  it("reports setup state when Supabase is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(getPublicEnvironment()).toMatchObject({ configured: false });
  });
  it("accepts valid publishable configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(getPublicEnvironment()).toMatchObject({ configured: true });
  });
});
