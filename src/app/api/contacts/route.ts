import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { contactSchema } from "@/lib/validation/personal-modules";

export async function GET() {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const { data, error } = await client.from("contacts").select("*").eq("owner_id", user.id).order("full_name").limit(500);
  if (error) return NextResponse.json({ error: "Не удалось загрузить контакты." }, { status: 500 });
  return NextResponse.json({ contacts: data });
}

export async function POST(request: Request) {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Проверьте контакт." }, { status: 400 });
  const { data, error } = await client.from("contacts").insert({ ...parsed.data, owner_id: user.id }).select().single();
  if (error) return NextResponse.json({ error: "Не удалось сохранить контакт." }, { status: 500 });
  return NextResponse.json({ contact: data }, { status: 201 });
}
