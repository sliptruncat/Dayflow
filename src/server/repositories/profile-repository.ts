import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ProfileUpdate } from "@/lib/validation/profile";

export async function getProfile(client: SupabaseClient<Database>, ownerId: string) {
  const { data, error } = await client.from("profiles").select("*").eq("id", ownerId).maybeSingle();
  if (error) throw new Error("Не удалось загрузить профиль.");
  return data;
}

export async function updateProfile(client: SupabaseClient<Database>, ownerId: string, update: ProfileUpdate) {
  const { data, error } = await client.from("profiles").update(update).eq("id", ownerId).select().single();
  if (error) throw new Error("Не удалось сохранить профиль.");
  return data;
}
