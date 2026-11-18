import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/safe-redirect";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeRedirectPath(url.searchParams.get("next"));
  const client = await getServerSupabaseClient();

  if (code && client) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) {
      const signInUrl = new URL("/auth/sign-in", url.origin);
      signInUrl.searchParams.set("error", "confirmation_failed");
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
