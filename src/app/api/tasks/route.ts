import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { taskCreateSchema } from "@/lib/validation/tasks";
import { createTask } from "@/server/repositories/task-repository";

export async function POST(request: Request) {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const parsed = taskCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректная задача." }, { status: 400 });
  try { return NextResponse.json({ task: await createTask(client, user.id, parsed.data) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось создать задачу." }, { status: 500 }); }
}
