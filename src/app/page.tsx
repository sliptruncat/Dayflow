import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/features/dashboard/dashboard";
import { getAppContext } from "@/server/app-context";

export default async function HomePage() {
  const context = await getAppContext();
  return <AppShell context={context}><Dashboard configured={context.configured} /></AppShell>;
}
