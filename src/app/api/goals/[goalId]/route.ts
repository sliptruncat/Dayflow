import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { deleteGoal, updateGoal } from "@/server/repositories/planner-repository";
export async function PATCH(request: Request, { params }: { params: Promise<{ goalId: string }> }) {
 const client = await getServerSupabaseClient(); if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 }); const { data: { user } } = await client.auth.getUser(); if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
 const body = await request.json().catch(() => null); const input: { progress?: number; status?: "active"|"completed"|"paused"|"archived" } = {};
 if (Number.isInteger(body?.progress) && body.progress >= 0 && body.progress <= 100) input.progress = body.progress;
 if (["active","completed","paused","archived"].includes(body?.status)) input.status = body.status;
 if (!Object.keys(input).length) return NextResponse.json({ error: "Нет корректных изменений." }, { status: 400 });
 try { const { goalId } = await params; return NextResponse.json({ goal: await updateGoal(client, user.id, goalId, input) }); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Ошибка." }, { status: 500 }); }
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ goalId: string }> }) {
 const client = await getServerSupabaseClient(); if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 }); const { data: { user } } = await client.auth.getUser(); if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
 try { const { goalId } = await params; await deleteGoal(client, user.id, goalId); return NextResponse.json({ ok: true }); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Ошибка." }, { status: 500 }); }
}
