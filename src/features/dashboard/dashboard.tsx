export function Dashboard() {
  const now = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  return (
    <section className="page-stack">
      <div className="hero"><p className="eyebrow">{now}</p><h1>Good day.</h1><p>Your personal space is ready. Connect your account to begin planning with real data.</p></div>
      <div className="card-grid">
        <article className="feature-card feature-card--primary"><span className="card-kicker">TODAY</span><h2>Nothing scheduled yet</h2><p>After you sign in, today’s tasks, sessions, and events will appear here.</p><Link className="button" href="/tasks">Explore tasks</Link></article>
        <article className="feature-card"><span className="card-kicker">FOCUS</span><h2>Timer needs a task</h2><p>Time is recorded from durable session timestamps—not a browser counter.</p></article>
        <article className="feature-card"><span className="card-kicker">AI</span><h2>Proposals stay in your control</h2><p>AI capture will always show editable details before it creates anything.</p></article>
      </div>
      <section className="empty-panel"><span className="empty-orb">◌</span><div><h2>Your dashboard will grow with you</h2><p>DAYFLOW deliberately shows no invented tasks, financial figures, sleep scores, or recommendations before there is authorized data.</p></div></section>
    </section>
  );
}
import Link from "next/link";

