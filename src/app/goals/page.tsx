import { AppShell } from "@/components/app-shell";
import { GoalsWorkspace } from "@/features/planner/goals-workspace";
import { getAppContext } from "@/server/app-context";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { listGoals } from "@/server/repositories/planner-repository";
export const dynamic="force-dynamic";
export default async function GoalsPage(){const context=await getAppContext();const client=await getServerSupabaseClient();let goals:Awaited<ReturnType<typeof listGoals>>=[];let loadError="";if(context.user&&client){try{goals=await listGoals(client,context.user.id);}catch{loadError="Не удалось загрузить цели. Проверьте, применена ли миграция 005 и доступна ли база данных.";}}return <AppShell context={context} activeSection="projects"><GoalsWorkspace initialGoals={goals} loadError={loadError}/></AppShell>;}
