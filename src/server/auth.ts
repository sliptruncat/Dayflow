import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const client = await getServerSupabaseClient();
  if (!client) return null;
  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  return user;
}
