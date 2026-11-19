import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { taskUpdateSchema } from "@/lib/validation/tasks";
import { deleteTask, updateTask } from "@/server/repositories/task-repository";

const taskIdSchema = z.string().uuid();
type RouteContext = { params: Promise<{ taskId: string }> };

async function getClientAndUser() {
  const client = await getServerSupabaseClient();
  if (!client) return { response: NextResponse.json({ error: "Supabase не настроен." }, { status: 503 }) };
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Требуется вход." }, { status: 401 }) };
  return { client, user };
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await getClientAndUser();
  if ("response" in auth) return auth.response;
  const taskId = taskIdSchema.safeParse((await context.params).taskId);
  const parsed = taskUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!taskId.success || !parsed.success) return NextResponse.json({ error: parsed.success ? "Некорректный идентификатор задачи." : parsed.error.issues[0]?.message }, { status: 400 });
  try { return NextResponse.json({ task: await updateTask(auth.client, auth.user.id, taskId.data, parsed.data) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось сохранить задачу." }, { status: 404 }); }
}

export async function DELETE(_: Request, context: RouteContext) {
  const auth = await getClientAndUser();
  if ("response" in auth) return auth.response;
  const taskId = taskIdSchema.safeParse((await context.params).taskId);
  if (!taskId.success) return NextResponse.json({ error: "Некорректный идентификатор задачи." }, { status: 400 });
  try { await deleteTask(auth.client, auth.user.id, taskId.data); return new NextResponse(null, { status: 204 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось удалить задачу." }, { status: 404 }); }
}
