import { AppShell } from "@/components/app-shell";
import { FocusStudio } from "@/features/focus/focus-studio";
import { getAppContext } from "@/server/app-context";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { listTasks } from "@/server/repositories/task-repository";
import { getProgress, listAchievements, listFocusSessions } from "@/server/repositories/progress-repository";
export const dynamic = "force-dynamic";
export default async function FocusPage() { const context = await getAppContext(); const client = await getServerSupabaseClient(); const loaded = context.user && client ? await Promise.allSettled([getProgress(client, context.user.id), listFocusSessions(client, context.user.id), listAchievements(client, context.user.id), listTasks(client, context.user.id)]) : null; const progress = loaded?.[0].status === "fulfilled" ? loaded[0].value : null; const sessions = loaded?.[1].status === "fulfilled" ? loaded[1].value : []; const achievements = loaded?.[2].status === "fulfilled" ? loaded[2].value : []; const tasks = loaded?.[3].status === "fulfilled" ? loaded[3].value : []; return <AppShell context={context} activeSection="focus"><FocusStudio initialProgress={progress} initialSessions={sessions} achievements={achievements} tasks={tasks} /></AppShell>; }
