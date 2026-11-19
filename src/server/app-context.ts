import { getPublicEnvironment } from "@/lib/env";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { getProfile } from "@/server/repositories/profile-repository";
import { getPreferences } from "@/server/repositories/preference-repository";

export type AppContext = {
  configured: boolean;
  user: Awaited<ReturnType<NonNullable<Awaited<ReturnType<typeof getServerSupabaseClient>>>["auth"]["getUser"]>>["data"]["user"] | null;
  profile: Awaited<ReturnType<typeof getProfile>> | null;
  preferences: Awaited<ReturnType<typeof getPreferences>> | null;
  databaseError: boolean;
};

export async function getAppContext() {
  const environment = getPublicEnvironment();
  if (!environment.configured) return { configured: false, user: null, profile: null, preferences: null, databaseError: false } satisfies AppContext;
  const client = await getServerSupabaseClient();
  if (!client) return { configured: false, user: null, profile: null, preferences: null, databaseError: false } satisfies AppContext;
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) {
    console.error("Could not load the authenticated Supabase user", authError);
    return { configured: true, user: null, profile: null, preferences: null, databaseError: true } satisfies AppContext;
  }
  if (!user) return { configured: true, user: null, profile: null, preferences: null, databaseError: false } satisfies AppContext;
  try {
    const [profile, preferences] = await Promise.all([getProfile(client, user.id), getPreferences(client, user.id)]);
    return { configured: true, user, profile, preferences, databaseError: false } satisfies AppContext;
  } catch (error) {
    console.error("Could not load DAYFLOW user context", error);
    return { configured: true, user, profile: null, preferences: null, databaseError: true } satisfies AppContext;
  }
}
