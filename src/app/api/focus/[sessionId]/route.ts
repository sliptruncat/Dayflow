import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { focusUpdateSchema } from "@/lib/validation/focus";
import { updateFocusSession } from "@/server/repositories/progress-repository";
type Context = { params: Promise<{ sessionId: string }> };
export async function PATCH(request: Request, context: Context) { const client = await getServerSupabaseClient(); if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 }); const { data: { user } } = await client.auth.getUser(); if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 }); const id = z.string().uuid().safeParse((await context.params).sessionId); const input = focusUpdateSchema.safeParse(await request.json().catch(() => null)); if (!id.success || !input.success) return NextResponse.json({ error: "Некорректные данные сессии." }, { status: 400 }); try { return NextResponse.json({ session: await updateFocusSession(client, user.id, id.data, input.data) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось сохранить сессию." }, { status: 404 }); } }
