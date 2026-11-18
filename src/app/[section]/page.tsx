import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionPlaceholder } from "@/features/section-placeholder";
import { navigationItems, type AppSection } from "@/lib/navigation";
import { getAppContext } from "@/server/app-context";

export function generateStaticParams() {
  return navigationItems.filter((item) => item.href !== "/").map((item) => ({ section: item.slug }));
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = navigationItems.find((candidate) => candidate.slug === section && candidate.href !== "/");
  if (!item) notFound();
  const context = await getAppContext();

  return <AppShell context={context} activeSection={section as AppSection}><SectionPlaceholder section={item} /></AppShell>;
}
