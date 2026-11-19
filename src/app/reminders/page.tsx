import { AppShell } from "@/components/app-shell";
import { RemindersWorkspace } from "@/features/planner/reminders-workspace";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { getAppContext } from "@/server/app-context";
import { listReminders } from "@/server/repositories/planner-repository";
import { listTasks } from "@/server/repositories/task-repository";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const context = await getAppContext();
  const client = await getServerSupabaseClient();
  let reminders: Awaited<ReturnType<typeof listReminders>> = [];
  let tasks: Awaited<ReturnType<typeof listTasks>> = [];
  let loadError = "";
  if (context.user && client) {
    const results = await Promise.allSettled([listReminders(client, context.user.id), listTasks(client, context.user.id)]);
    if (results[0].status === "fulfilled") reminders = results[0].value; else loadError = "Не удалось загрузить напоминания.";
    if (results[1].status === "fulfilled") tasks = results[1].value; else loadError = "Не удалось загрузить задачи для напоминаний.";
  }
  return <AppShell context={context} activeSection="reminders"><RemindersWorkspace initialReminders={reminders} tasks={tasks.map(({ id, title, status }) => ({ id, title, status }))} loadError={loadError} /></AppShell>;
}
