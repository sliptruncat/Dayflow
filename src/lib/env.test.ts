import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicEnvironment } from "./env";
afterEach(() => vi.unstubAllEnvs());
describe("public environment", () => { it("reports setup state when Supabase is absent", () => { vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ""); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""); expect(getPublicEnvironment()).toMatchObject({ configured: false }); }); it("accepts valid public configuration", () => { vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key"); expect(getPublicEnvironment()).toMatchObject({ configured: true }); }); });
