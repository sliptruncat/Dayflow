import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { TaskCreate, TaskUpdate } from "@/lib/validation/tasks";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

export async function listTasks(client: SupabaseClient<Database>, ownerId: string) {
  const { data, error } = await client.from("tasks").select("*").eq("owner_id", ownerId).order("completed_at", { ascending: true }).order("created_at", { ascending: false });
  if (error) throw new Error("Не удалось загрузить задачи.");
  return data;
}

export async function createTask(client: SupabaseClient<Database>, ownerId: string, input: TaskCreate) {
  const { data, error } = await client.from("tasks").insert({ owner_id: ownerId, title: input.title, description: input.description ?? null, priority: input.priority, deadline_at: input.deadline_at ?? null, start_at: input.start_at ?? null, category_id: input.category_id ?? null, color_override: input.color_override ?? null, is_all_day: input.is_all_day ?? false, estimated_minutes: input.estimated_minutes ?? null, status: input.deadline_at ? "planned" : "inbox" }).select().single();
  if (error) throw new Error("Не удалось создать задачу.");
  return data;
}

export async function updateTask(client: SupabaseClient<Database>, ownerId: string, taskId: string, input: TaskUpdate): Promise<TaskRow> {
  const { data, error } = await client.from("tasks").update(input).eq("id", taskId).eq("owner_id", ownerId).select().maybeSingle();
  if (error) throw new Error("Не удалось сохранить задачу.");
  if (!data) throw new Error("Задача не найдена.");
  return data;
}

export async function deleteTask(client: SupabaseClient<Database>, ownerId: string, taskId: string) {
  const { data, error } = await client.from("tasks").delete().eq("id", taskId).eq("owner_id", ownerId).select("id").maybeSingle();
  if (error) throw new Error("Не удалось удалить задачу.");
  if (!data) throw new Error("Задача не найдена.");
}
