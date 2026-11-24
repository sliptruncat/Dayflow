import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function listInbox(client: SupabaseClient<Database>, ownerId: string) {
  const { data, error } = await client.from("inbox_items").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (error) throw new Error("Не удалось загрузить входящие.");
  return data;
}
export async function createInboxItem(client: SupabaseClient<Database>, ownerId: string, title: string, body: string | null) {
  const { data, error } = await client.from("inbox_items").insert({ owner_id: ownerId, title, body }).select().single();
  if (error) {
    console.error("[inbox] Failed to create inbox item:", error);
    if (error.code === "42P01" || error.code === "42703") {
      throw new Error("Таблица «Входящие» ещё не создана в базе данных. Нужно применить миграцию 202611190005_inbox_goals_reminders.sql в Supabase.");
    }
    throw new Error("Не удалось сохранить заметку. Проверьте подключение к базе и попробуйте ещё раз.");
  }
  return data;
}
export async function updateInboxItem(client: SupabaseClient<Database>, ownerId: string, id: string, input: Database["public"]["Tables"]["inbox_items"]["Update"]) {
  const { data, error } = await client.from("inbox_items").update(input).eq("id", id).eq("owner_id", ownerId).select().maybeSingle();
  if (error || !data) throw new Error("Запись не найдена.");
  return data;
}
export async function deleteInboxItem(client: SupabaseClient<Database>, ownerId: string, id: string) {
  const { error } = await client.from("inbox_items").delete().eq("id", id).eq("owner_id", ownerId);
  if (error) throw new Error("Не удалось удалить запись.");
}
export async function listGoals(client: SupabaseClient<Database>, ownerId: string) {
  const { data, error } = await client.from("goals").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (error) throw new Error("Не удалось загрузить цели.");
  return data;
}
export async function createGoal(client: SupabaseClient<Database>, ownerId: string, input: { title: string; description: string | null; target_date: string | null }) {
  const { data, error } = await client.from("goals").insert({ owner_id: ownerId, ...input }).select().single();
  if (error) throw new Error("Не удалось создать цель.");
  return data;
}
export async function updateGoal(client: SupabaseClient<Database>, ownerId: string, id: string, input: Database["public"]["Tables"]["goals"]["Update"]) {
  const { data, error } = await client.from("goals").update(input).eq("id", id).eq("owner_id", ownerId).select().maybeSingle();
  if (error || !data) throw new Error("Цель не найдена.");
  return data;
}
export async function deleteGoal(client: SupabaseClient<Database>, ownerId: string, id: string) {
  const { error } = await client.from("goals").delete().eq("id", id).eq("owner_id", ownerId);
  if (error) throw new Error("Не удалось удалить цель.");
}
export async function listReminders(client: SupabaseClient<Database>, ownerId: string) {
  const { data, error } = await client.from("task_reminders").select("*").eq("owner_id", ownerId).eq("status", "scheduled").order("remind_at");
  if (error) throw new Error("Не удалось загрузить напоминания.");
  return data;
}
