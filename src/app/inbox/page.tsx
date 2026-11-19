import { AppShell } from "@/components/app-shell";
import { InboxWorkspace } from "@/features/planner/inbox-workspace";
import { getAppContext } from "@/server/app-context";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { listInbox } from "@/server/repositories/planner-repository";
export const dynamic="force-dynamic";
export default async function InboxPage(){const context=await getAppContext();const client=await getServerSupabaseClient();let items:Awaited<ReturnType<typeof listInbox>>=[];let loadError="";if(context.user&&client){try{items=await listInbox(client,context.user.id);}catch{loadError="Не удалось загрузить записи. Проверьте, применена ли миграция 005 и доступна ли база данных.";}}return <AppShell context={context} activeSection="inbox"><InboxWorkspace initialItems={items} loadError={loadError}/></AppShell>;}
