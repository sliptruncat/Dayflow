import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { financeTransactionSchema } from "@/lib/validation/personal-modules";

export async function GET() {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const { data, error } = await client.from("finance_transactions").select("*").eq("owner_id", user.id).order("occurred_on", { ascending: false }).limit(250);
  if (error) return NextResponse.json({ error: "Не удалось загрузить операции." }, { status: 500 });
  return NextResponse.json({ transactions: data });
}

export async function POST(request: Request) {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const parsed = financeTransactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Проверьте операцию." }, { status: 400 });
  const { data, error } = await client.from("finance_transactions").insert({ ...parsed.data, owner_id: user.id }).select().single();
  if (error) return NextResponse.json({ error: "Не удалось сохранить операцию." }, { status: 500 });
  return NextResponse.json({ transaction: data }, { status: 201 });
}
