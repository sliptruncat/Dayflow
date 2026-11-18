import { getPublicEnvironment } from "@/lib/env";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { getProfile } from "@/server/repositories/profile-repository";
import { getPreferences } from "@/server/repositories/preference-repository";

export async function getAppContext() {
  const environment = getPublicEnvironment();
  if (!environment.configured) return { configured: false as const, user: null, profile: null, preferences: null };
  const client = await getServerSupabaseClient();
  if (!client) return { configured: false as const, user: null, profile: null, preferences: null };
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { configured: true as const, user: null, profile: null, preferences: null };
  const [profile, preferences] = await Promise.all([getProfile(client, user.id), getPreferences(client, user.id)]);
  return { configured: true as const, user, profile, preferences };
}
