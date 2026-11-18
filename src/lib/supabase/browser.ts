"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnvironment } from "@/lib/env";
import type { Database } from "@/types/database";

let client: SupabaseClient<Database> | undefined;

export function getBrowserSupabaseClient(): SupabaseClient<Database> | null {
  const environment = getPublicEnvironment();
  if (!environment.configured) return null;
  client ??= createBrowserClient<Database>(
    environment.values.NEXT_PUBLIC_SUPABASE_URL,
    environment.values.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return client;
}
