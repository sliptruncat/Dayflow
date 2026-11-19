import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { createGoal } from "@/server/repositories/planner-repository";
export async function POST(request: Request) {
 const client = await getServerSupabaseClient(); if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 }); const { data: { user } } = await client.auth.getUser(); if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
 const body = await request.json().catch(() => null); const title = typeof body?.title === "string" ? body.title.trim() : ""; const description = typeof body?.description === "string" ? body.description.trim() : ""; const target_date = typeof body?.target_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.target_date) ? body.target_date : null;
 if (!title || title.length > 180 || description.length > 5000) return NextResponse.json({ error: "Проверьте название и описание цели." }, { status: 400 });
 try { return NextResponse.json({ goal: await createGoal(client, user.id, { title, description: description || null, target_date }) }, { status: 201 }); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Ошибка." }, { status: 500 }); }
}
