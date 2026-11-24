import Link from "next/link";
import { TodayQuickCapture } from "@/features/dashboard/today-quick-capture";
import { TodayDate } from "@/features/dashboard/today-date";

export function Dashboard({ configured, timeZone = "UTC" }: { configured: boolean; timeZone?: string }) {
  const initialDate = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(new Date());

  return <section className="page-stack dashboard">
    <header className="dashboard-intro"><div><TodayDate timeZone={timeZone} initialDate={initialDate} /><h1>Добрый день.</h1><p>{configured ? "Спокойно соберите день вокруг того, что действительно важно." : "Подключите личное пространство — и календарь станет вашим местом для планирования."}</p></div><Link className="button button--accent" href={configured ? "/calendar" : "/auth/sign-in"}>{configured ? "Открыть календарь" : "Подключить пространство"}<span aria-hidden>↗</span></Link></header>
    <TodayQuickCapture configured={configured} />
    <div className="dashboard-grid">
      <article className="feature-card feature-card--calendar"><div><span className="card-kicker">ЛИЧНЫЙ КАЛЕНДАРЬ</span><h2>{configured ? "Ваше рабочее поле" : "Календарь ждёт подключения"}</h2><p>{configured ? "Задачи и события живут в одном ритме: выберите дату, добавьте важное, возвращайтесь без лишних списков." : "Добавьте URL проекта и publishable key в .env.local. Подробный порядок есть в README."}</p></div><div className="calendar-preview" aria-hidden><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><b /><b className="calendar-preview--accent" /><b /><b /><b /><b /><b /><b /></div></article>
      <article className="feature-card feature-card--focus"><span className="card-kicker">ФОКУС</span><h2>Один ясный шаг за раз</h2><p>Запускайте мягкий Pomodoro, привязывайте его к делу и возвращайтесь к своему ритму.</p><Link href="/focus" className="text-button">Открыть фокус →</Link></article>
      <article className="feature-card feature-card--gentle"><span className="card-kicker">КОМПАНЬОН</span><h2>Ваш динозавр растёт вместе с вами</h2><p>Выполняйте задачи и фокус-сессии, чтобы открывать уровни, стадии и награды.</p><Link href="/focus" className="text-button">Посмотреть прогресс →</Link></article>
    </div>
  </section>;
}
