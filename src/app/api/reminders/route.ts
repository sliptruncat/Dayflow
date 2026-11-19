import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });

  const { data, error } = await client
    .from("task_reminders")
    .select("*")
    .eq("owner_id", user.id)
    .eq("status", "scheduled")
    .order("remind_at");

  if (error) {
    console.error("[reminders] Failed to load reminders:", error);
    return NextResponse.json({ error: "Не удалось загрузить напоминания. Проверьте настройки базы данных." }, { status: 500 });
  }
  return NextResponse.json({ reminders: data });
}

export async function POST(request: Request) {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const taskId = typeof body?.task_id === "string" ? body.task_id.trim() : "";
  const remindAt = typeof body?.remind_at === "string" ? body.remind_at : "";
  const remindAtDate = new Date(remindAt);

  if (!taskId || !Number.isFinite(remindAtDate.getTime()) || remindAtDate.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Выберите задачу и будущее время напоминания." }, { status: 400 });
  }

  // Check ownership explicitly so the UI can distinguish a stale/foreign task
  // from a missing or incorrectly configured reminder table.
  const { data: task, error: taskError } = await client
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (taskError) {
    console.error("[reminders] Failed to validate task ownership:", taskError);
    return NextResponse.json({ error: "Не удалось проверить задачу. Обновите страницу и попробуйте снова." }, { status: 500 });
  }
  if (!task) {
    return NextResponse.json({ error: "Эта задача не найдена в вашем аккаунте. Обновите список и выберите свою задачу." }, { status: 404 });
  }

  const { data, error } = await client
    .from("task_reminders")
    .insert({ owner_id: user.id, task_id: taskId, remind_at: remindAtDate.toISOString() })
    .select()
    .single();

  if (error) {
    console.error("[reminders] Failed to insert reminder:", error);
    if (error.code === "42P01" || error.code === "42703" || error.code === "23503" || error.code === "42830") {
      return NextResponse.json({
        error: "База данных ещё не подготовлена для напоминаний. Нужно применить миграции задач и напоминаний в Supabase.",
      }, { status: 503 });
    }
    return NextResponse.json({ error: "Не удалось сохранить напоминание. Попробуйте ещё раз; подробность ошибки записана в журнал сервера." }, { status: 500 });
  }

  return NextResponse.json({ reminder: data }, { status: 201 });
}
