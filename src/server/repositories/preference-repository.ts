import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PreferenceUpdate } from "@/lib/validation/preferences";

const defaultPreferences = {
  theme_id: "sage" as const,
  locale: "ru",
  timezone: "UTC",
  week_starts_on: 1,
  time_format: "24h" as const,
  date_format: "DD.MM.YYYY" as const,
};

export async function getPreferences(client: SupabaseClient<Database>, ownerId: string) {
  const { data, error } = await client.from("user_preferences").select("*").eq("owner_id", ownerId).maybeSingle();
  if (error) throw new Error("Не удалось загрузить настройки.");
  return data;
}

export async function updatePreferences(client: SupabaseClient<Database>, ownerId: string, update: PreferenceUpdate) {
  const { data, error } = await client.from("user_preferences").update(update).eq("owner_id", ownerId).select().maybeSingle();
  if (error) throw new Error("Не удалось сохранить настройки.");
  if (data) return data;

  // The auth trigger creates preferences for new accounts. This covers accounts
  // that predate that trigger without treating a database or RLS error as empty data.
  const { data: created, error: createError } = await client
    .from("user_preferences")
    .insert({ owner_id: ownerId, ...defaultPreferences, ...update })
    .select()
    .single();
  if (createError) throw new Error("Не удалось создать настройки по умолчанию.");
  return created;
}
