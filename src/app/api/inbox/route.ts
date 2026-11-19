import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { createInboxItem } from "@/server/repositories/planner-repository";
export async function POST(request: Request) {
  const client = await getServerSupabaseClient(); if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser(); if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const body = await request.json().catch(() => null); const title = typeof body?.title === "string" ? body.title.trim() : ""; const note = typeof body?.body === "string" ? body.body.trim() : "";
  if (!title || title.length > 240 || note.length > 10000) return NextResponse.json({ error: "Проверьте название и текст записи." }, { status: 400 });
  try { return NextResponse.json({ item: await createInboxItem(client, user.id, title, note || null) }, { status: 201 }); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Ошибка." }, { status: 500 }); }
}
