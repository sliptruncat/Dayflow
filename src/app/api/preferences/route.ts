import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { preferenceUpdateSchema } from "@/lib/validation/preferences";
import { updatePreferences } from "@/server/repositories/preference-repository";

export async function PATCH(request: Request) {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const parsed = preferenceUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные настройки." }, { status: 400 });
  try { return NextResponse.json({ preferences: await updatePreferences(client, user.id, parsed.data) }); }
  catch { return NextResponse.json({ error: "Не удалось сохранить настройки." }, { status: 500 }); }
}
