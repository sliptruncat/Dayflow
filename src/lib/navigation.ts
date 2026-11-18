export type AppSection =
  | "dashboard" | "calendar" | "tasks" | "inbox" | "assistant" | "projects"
  | "finance" | "contacts" | "health" | "analytics" | "settings";

export type NavigationItem = { slug: AppSection; label: string; href: string; description: string };

export const navigationItems: NavigationItem[] = [
  { slug: "dashboard", label: "Today", href: "/", description: "A calm overview of your day." },
  { slug: "calendar", label: "Calendar", href: "/calendar", description: "Plan days and see commitments in context." },
  { slug: "tasks", label: "Tasks", href: "/tasks", description: "Capture, organize, and complete meaningful work." },
  { slug: "inbox", label: "Inbox", href: "/inbox", description: "Keep unprocessed thoughts safe until you are ready." },
  { slug: "assistant", label: "AI assistant", href: "/assistant", description: "Review proposals before any change is made." },
  { slug: "projects", label: "Projects", href: "/projects", description: "Connect related work, people, and outcomes." },
  { slug: "finance", label: "Finance", href: "/finance", description: "Track personal and project finances deliberately." },
  { slug: "contacts", label: "Contacts", href: "/contacts", description: "Remember people and the context that matters." },
  { slug: "health", label: "Health", href: "/health", description: "View health data only after an authorized connection." },
  { slug: "analytics", label: "Analytics", href: "/analytics", description: "Understand patterns from your actual history." },
  { slug: "settings", label: "Settings", href: "/settings", description: "Choose how DAYFLOW feels and behaves." },
];
