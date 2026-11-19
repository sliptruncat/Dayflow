import { AppShell } from "@/components/app-shell";
import { TaskWorkspace } from "@/features/tasks/task-workspace";
import { getAppContext } from "@/server/app-context";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { listTasks } from "@/server/repositories/task-repository";
import { listCategories } from "@/server/repositories/category-repository";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const context = await getAppContext();
  const client = await getServerSupabaseClient();
  const result = context.user && client ? await Promise.allSettled([listTasks(client, context.user.id), listCategories(client, context.user.id)]) : null;
  const tasks = result?.[0].status === "fulfilled" ? result[0].value : [];
  const categories = result?.[1].status === "fulfilled" ? result[1].value : [];
  const dataError = context.databaseError || result?.[0].status === "rejected";
  return <AppShell context={context} activeSection="tasks"><TaskWorkspace initialTasks={tasks} initialCategories={categories} dataError={dataError} timeZone={context.preferences?.timezone ?? "UTC"} title="Мои задачи" subtitle="Ваши задачи доступны только вам и сохраняются в личном календаре." /></AppShell>;
}
