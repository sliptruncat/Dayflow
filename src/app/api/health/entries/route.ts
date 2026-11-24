import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { healthEntrySchema } from "@/lib/validation/personal-modules";

export async function GET() {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const { data, error } = await client.from("health_entries").select("*").eq("owner_id", user.id).order("entry_date", { ascending: false }).limit(180);
  if (error) return NextResponse.json({ error: "Не удалось загрузить дневник." }, { status: 500 });
  return NextResponse.json({ entries: data });
}

export async function POST(request: Request) {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const parsed = healthEntrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Проверьте запись." }, { status: 400 });
  const { data, error } = await client.from("health_entries").upsert({ ...parsed.data, owner_id: user.id }, { onConflict: "owner_id,entry_date" }).select().single();
  if (error) return NextResponse.json({ error: "Не удалось сохранить запись." }, { status: 500 });
  return NextResponse.json({ entry: data }, { status: 201 });
}
