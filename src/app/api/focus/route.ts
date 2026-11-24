import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { focusCreateSchema } from "@/lib/validation/focus";
import { createFocusSession } from "@/server/repositories/progress-repository";

export async function GET() {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });

  const { data, error } = await client
    .from("focus_sessions")
    .select("*")
    .eq("owner_id", user.id)
    .in("status", ["running", "paused"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Не удалось загрузить активную Focus-сессию." }, { status: 500 });
  return NextResponse.json({ session: data });
}

export async function POST(request: Request) {
  const client = await getServerSupabaseClient();
  if (!client) return NextResponse.json({ error: "Supabase не настроен." }, { status: 503 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const input = focusCreateSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message ?? "Некорректная сессия." }, { status: 400 });

  const { data: existingSession, error: lookupError } = await client
    .from("focus_sessions")
    .select("id")
    .eq("owner_id", user.id)
    .in("status", ["running", "paused"])
    .limit(1)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Не удалось проверить активную Focus-сессию." }, { status: 500 });
  if (existingSession) return NextResponse.json({ error: "У вас уже есть активная Focus-сессия. Откройте её, чтобы продолжить." }, { status: 409 });

  try {
    return NextResponse.json({ session: await createFocusSession(client, user.id, input.data) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось начать сессию." }, { status: 400 });
  }
}
