import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnvironment } from "@/lib/env";
import type { Database } from "@/types/database";

const publicPaths = new Set(["/auth/sign-in", "/auth/sign-up", "/auth/reset-password", "/auth/update-password", "/auth/callback"]);

export async function refreshSession(request: NextRequest) {
  const environment = getPublicEnvironment();
  if (!environment.configured) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    environment.values.NEXT_PUBLIC_SUPABASE_URL,
    environment.values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  // Route handlers own their JSON authentication errors. Redirecting an API
  // request to an HTML sign-in page turns a missing session into a false 200.
  if (path.startsWith("/api/")) return response;
  if (!user && !publicPaths.has(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (user && ["/auth/sign-in", "/auth/sign-up"].includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}
