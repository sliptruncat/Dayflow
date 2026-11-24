import { AppShell } from "@/components/app-shell";
import { TaskWorkspace } from "@/features/tasks/task-workspace";
import { getAppContext } from "@/server/app-context";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { listTasks } from "@/server/repositories/task-repository";
import { listCategories } from "@/server/repositories/category-repository";
import { listSubtasks } from "@/server/repositories/subtask-repository";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const context = await getAppContext();
  const client = await getServerSupabaseClient();
  const result = context.user && client ? await Promise.allSettled([listTasks(client, context.user.id), listCategories(client, context.user.id)]) : null;
  const tasks = result?.[0].status === "fulfilled" ? result[0].value : [];
  const categories = result?.[1].status === "fulfilled" ? result[1].value : [];
  const subtasksResult = context.user && client && tasks.length > 0 ? await Promise.allSettled([listSubtasks(client, context.user.id, tasks.map((task) => task.id))]) : null;
  const subtasks = subtasksResult?.[0].status === "fulfilled" ? subtasksResult[0].value : [];
  const dataError = context.databaseError || result?.[0].status === "rejected" || result?.[1].status === "rejected" || subtasksResult?.[0].status === "rejected";
  return <AppShell context={context} activeSection="tasks"><TaskWorkspace initialTasks={tasks} initialCategories={categories} initialSubtasks={subtasks} dataError={dataError} timeZone={context.preferences?.timezone ?? "UTC"} title="Мои задачи" subtitle="Ваши задачи доступны только вам и сохраняются в личном календаре." /></AppShell>;
}
