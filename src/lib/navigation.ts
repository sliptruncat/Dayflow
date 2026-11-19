export type AppSection = "dashboard" | "calendar" | "tasks" | "inbox" | "assistant" | "projects" | "finance" | "contacts" | "health" | "analytics" | "settings" | "focus" | "reminders";
export type NavigationItem = { slug: AppSection; label: string; href: string; description: string };
export const navigationItems: NavigationItem[] = [
  { slug: "dashboard", label: "Сегодня", href: "/", description: "Спокойный обзор вашего дня." },
  { slug: "calendar", label: "Календарь", href: "/calendar", description: "Планируйте дни и смотрите на обязательства целиком." },
  { slug: "tasks", label: "Задачи", href: "/tasks", description: "Собирайте, организуйте и завершайте важные дела." },
  { slug: "focus", label: "Фокус", href: "/focus", description: "Выделите время для одной важной задачи." },
  { slug: "inbox", label: "Входящие", href: "/inbox", description: "Сохраняйте мысли, чтобы разобрать их позже." },
  { slug: "reminders", label: "Напоминания", href: "/reminders", description: "Выбирайте, когда задача должна снова привлечь ваше внимание." },
  { slug: "assistant", label: "Помощник", href: "/assistant", description: "Помощь в планировании с вашим подтверждением действий." },
  { slug: "projects", label: "Цели", href: "/goals", description: "Двигайтесь к важным результатам небольшими шагами." },
  { slug: "finance", label: "Финансы", href: "/finance", description: "Управляйте личными и проектными финансами." },
  { slug: "contacts", label: "Контакты", href: "/contacts", description: "Храните важные контакты и контекст общения." },
  { slug: "health", label: "Здоровье", href: "/health", description: "Подключайте данные о здоровье только с разрешения." },
  { slug: "analytics", label: "Аналитика", href: "/analytics", description: "Изучайте закономерности на основе своей истории." },
  { slug: "settings", label: "Настройки", href: "/settings", description: "Настраивайте внешний вид и поведение DAYFLOW." },
];
