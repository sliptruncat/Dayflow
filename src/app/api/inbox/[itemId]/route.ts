import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { deleteInboxItem, updateInboxItem } from "@/server/repositories/planner-repository";
export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
 const client = await getServerSupabaseClient(); if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 }); const { data: { user } } = await client.auth.getUser(); if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
 const body = await request.json().catch(() => null); if (!body || !["open","processed","archived"].includes(body.status)) return NextResponse.json({ error: "Некорректный статус." }, { status: 400 });
 try { const { itemId } = await params; return NextResponse.json({ item: await updateInboxItem(client, user.id, itemId, { status: body.status }) }); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Ошибка." }, { status: 500 }); }
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
 const client = await getServerSupabaseClient(); if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 }); const { data: { user } } = await client.auth.getUser(); if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
 try { const { itemId } = await params; await deleteInboxItem(client, user.id, itemId); return NextResponse.json({ ok: true }); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Ошибка." }, { status: 500 }); }
}
