import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url); const code = url.searchParams.get("code"); const next = url.searchParams.get("next") || "/";
  const client = await getServerSupabaseClient();
  if (code && client) await client.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/", url.origin));
}
