import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { subtaskCreateSchema } from "@/lib/validation/subtasks";
import { createSubtask } from "@/server/repositories/subtask-repository";
type Context = { params: Promise<{ taskId: string }> };
export async function POST(request: Request, context: Context) { const client = await getServerSupabaseClient(); if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 }); const { data: { user } } = await client.auth.getUser(); if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 }); const taskId = z.string().uuid().safeParse((await context.params).taskId); const input = subtaskCreateSchema.safeParse(await request.json().catch(() => null)); if (!taskId.success || !input.success) return NextResponse.json({ error: input.success ? "Некорректная задача." : input.error.issues[0]?.message }, { status: 400 }); try { return NextResponse.json({ subtask: await createSubtask(client, user.id, taskId.data, input.data) }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось создать подзадачу." }, { status: 404 }); } }
