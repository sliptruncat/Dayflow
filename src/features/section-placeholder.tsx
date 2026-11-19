import type { NavigationItem } from "@/lib/navigation";
const copy: Record<string, { title: string; text: string }> = {
  finance: { title: "Финансовый раздел готовится", text: "Здесь появятся бюджеты, регулярные платежи и финансовые цели. Сейчас этот раздел ещё не подключён к базе данных." },
  contacts: { title: "Контакты появятся здесь", text: "Раздел для людей, важных дат и заметок о взаимодействиях. Функциональность ещё в разработке." },
  health: { title: "Личное пространство здоровья", text: "Подключение источников здоровья будет отдельным добровольным шагом. Пока интеграции не активированы." },
  settings: { title: "Настройки пространства", text: "Выбор цветовой темы уже доступен в боковой панели. Дополнительные настройки аккаунта будут добавлены отдельно." },
};
export function SectionPlaceholder({ section }: { section: NavigationItem }) {
  const content = copy[section.slug] ?? { title: "Раздел в разработке", text: "Этот раздел пока не подключён. Основные рабочие инструменты находятся в календаре, задачах, фокусе, входящих, целях и напоминаниях." };
  return <section className="page-stack"><div className="hero"><p className="eyebrow">DAYFLOW / ЛИЧНОЕ ПРОСТРАНСТВО</p><h1>{section.label}</h1><p>{section.description}</p></div><div className="empty-panel"><span className="empty-orb">◌</span><div><h2>{content.title}</h2><p>{content.text}</p></div></div></section>;
}
