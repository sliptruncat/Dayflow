import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnvironment } from "@/lib/env";
import type { Database } from "@/types/database";

export async function getServerSupabaseClient() {
  const environment = getPublicEnvironment();
  if (!environment.configured) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(environment.values.NEXT_PUBLIC_SUPABASE_URL, environment.values.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server Components cannot write cookies. Middleware refreshes sessions. */ }
      },
    },
  });
}
