import type { NavigationItem } from "@/lib/navigation";

const readiness: Partial<Record<string, string>> = {
  calendar: "Calendar views arrive after authenticated task persistence is in place.",
  tasks: "Task creation and editing are the next durable workflow after authentication.",
  inbox: "Inbox will safely retain raw notes, voice captures, and screenshots.",
  assistant: "The assistant will prepare structured proposals; it will not make hidden changes.",
  settings: "Theme preview is available now; account-synced preferences arrive with Supabase.",
};

export function SectionPlaceholder({ section }: { section: NavigationItem }) {
  return <section className="page-stack"><div className="hero"><p className="eyebrow">DAYFLOW / {section.label.toUpperCase()}</p><h1>{section.label}</h1><p>{section.description}</p></div><div className="empty-panel"><span className="empty-orb">◌</span><div><h2>Ready for its data contract</h2><p>{readiness[section.slug] ?? "This module is planned after the core task, calendar, and time-tracking foundations are durable."}</p><p className="muted">This is an intentional empty state, not sample data.</p></div></div></section>;
}
