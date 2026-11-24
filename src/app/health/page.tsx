import { AppShell } from "@/components/app-shell";
import { PersonalModuleWorkspace } from "@/features/personal-modules/personal-module-workspace";
import { getAppContext } from "@/server/app-context";
export const dynamic = "force-dynamic";
export default async function Page() {
  const context = await getAppContext();
  return <AppShell context={context} activeSection="health"><PersonalModuleWorkspace kind="health" timeZone={context.preferences?.timezone ?? "UTC"} /></AppShell>;
}
