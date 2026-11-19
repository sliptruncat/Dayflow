import { AppShell } from "@/components/app-shell";
import { getAppContext } from "@/server/app-context";
import { AssistantWorkspace } from "@/features/planner/assistant-workspace";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const context = await getAppContext();
  return <AppShell context={context} activeSection="assistant"><AssistantWorkspace /></AppShell>;
}
