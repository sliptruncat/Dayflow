import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { contactInteractionSchema } from "@/lib/validation/personal-modules";

export async function GET(request: Request) {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const contactId = new URL(request.url).searchParams.get("contact_id");
  if (!contactId) return NextResponse.json({ error: "Укажите контакт." }, { status: 400 });
  const { data, error } = await client.from("contact_interactions").select("*").eq("owner_id", user.id).eq("contact_id", contactId).order("occurred_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Не удалось загрузить историю общения." }, { status: 500 });
  return NextResponse.json({ interactions: data });
}

export async function POST(request: Request) {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const parsed = contactInteractionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Проверьте запись." }, { status: 400 });
  const { data, error } = await client.from("contact_interactions").insert({ ...parsed.data, owner_id: user.id }).select().single();
  if (error) return NextResponse.json({ error: "Не удалось сохранить историю общения. Проверьте выбранный контакт." }, { status: 400 });
  return NextResponse.json({ interaction: data }, { status: 201 });
}
