import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PreferenceUpdate } from "@/lib/validation/preferences";

export async function getPreferences(client: SupabaseClient<Database>, ownerId: string) {
  const { data, error } = await client.from("user_preferences").select("*").eq("owner_id", ownerId).maybeSingle();
  if (error) throw new Error("Не удалось загрузить настройки.");
  return data;
}

export async function updatePreferences(client: SupabaseClient<Database>, ownerId: string, update: PreferenceUpdate) {
  const { data, error } = await client.from("user_preferences").update(update).eq("owner_id", ownerId).select().single();
  if (error) throw new Error("Не удалось сохранить настройки.");
  return data;
}
