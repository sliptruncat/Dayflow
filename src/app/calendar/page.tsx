import { AppShell } from "@/components/app-shell";
import { TaskWorkspace } from "@/features/tasks/task-workspace";
import { getAppContext } from "@/server/app-context";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { listTasks } from "@/server/repositories/task-repository";
import { listEvents } from "@/server/repositories/event-repository";
import { listCategories } from "@/server/repositories/category-repository";
import { listSubtasks } from "@/server/repositories/subtask-repository";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const context = await getAppContext();
  const client = await getServerSupabaseClient();
  const results = context.user && client ? await Promise.allSettled([listTasks(client, context.user.id), listEvents(client, context.user.id), listCategories(client, context.user.id)]) : null;
  const tasks = results?.[0].status === "fulfilled" ? results[0].value : [];
  const events = results?.[1].status === "fulfilled" ? results[1].value : [];
  const categories = results?.[2].status === "fulfilled" ? results[2].value : [];
  const subtasksResult = context.user && client && tasks.length > 0 ? await Promise.allSettled([listSubtasks(client, context.user.id, tasks.map((task) => task.id))]) : null;
  const subtasks = subtasksResult?.[0].status === "fulfilled" ? subtasksResult[0].value : [];
  const dataError = context.databaseError || results?.some((result) => result.status === "rejected") === true || subtasksResult?.[0].status === "rejected";
  return <AppShell context={context} activeSection="calendar"><TaskWorkspace initialTasks={tasks} initialEvents={events} initialCategories={categories} initialSubtasks={subtasks} dataError={dataError} timeZone="Europe/Moscow" showMonth title="Мой календарь" subtitle="Создавайте дела и события, отмечайте выполненные и возвращайтесь к ним после перезагрузки." /></AppShell>;
}
