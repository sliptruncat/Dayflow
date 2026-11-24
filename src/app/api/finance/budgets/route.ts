import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { financeBudgetSchema } from "@/lib/validation/personal-modules";

export async function GET() {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const { data, error } = await client.from("finance_budgets").select("*").eq("owner_id", user.id).order("starts_on", { ascending: false });
  if (error) return NextResponse.json({ error: "Не удалось загрузить бюджеты." }, { status: 500 });
  return NextResponse.json({ budgets: data });
}

export async function POST(request: Request) {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const parsed = financeBudgetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Проверьте бюджет." }, { status: 400 });
  const { data, error } = await client.from("finance_budgets").insert({ ...parsed.data, owner_id: user.id }).select().single();
  if (error) return NextResponse.json({ error: "Не удалось сохранить бюджет." }, { status: 400 });
  return NextResponse.json({ budget: data }, { status: 201 });
}
