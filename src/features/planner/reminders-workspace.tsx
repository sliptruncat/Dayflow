"use client";

import { useMemo, useState } from "react";
import { VoiceInput } from "@/components/voice-input";

type TaskOption = { id: string; title: string; status: string };
type Reminder = { id: string; task_id: string; remind_at: string; status: string };

function localDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function RemindersWorkspace({ initialReminders, tasks, loadError = "" }: { initialReminders: Reminder[]; tasks: TaskOption[]; loadError?: string }) {
  const [reminders, setReminders] = useState(initialReminders);
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [taskSearch, setTaskSearch] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const filteredTasks = useMemo(() => tasks.filter((task) => task.title.toLocaleLowerCase("ru-RU").includes(taskSearch.trim().toLocaleLowerCase("ru-RU"))), [tasks, taskSearch]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskId || !remindAt) return;
    const selectedDate = new Date(remindAt);
    if (!Number.isFinite(selectedDate.getTime()) || selectedDate.getTime() <= Date.now()) {
      setError("Выберите дату и время в будущем."); return;
    }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task_id: taskId, remind_at: selectedDate.toISOString() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Не удалось создать напоминание.");
      setReminders((current) => [...current, data.reminder].sort((a, b) => a.remind_at.localeCompare(b.remind_at)));
      setRemindAt("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать напоминание.");
    } finally { setBusy(false); }
  }

  async function cancel(id: string) {
    try {
      const response = await fetch(`/api/reminders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Не удалось отменить напоминание."); return;
      }
      setReminders((current) => current.filter((reminder) => reminder.id !== id));
    } catch { setError("Не удалось связаться с сервером. Попробуйте ещё раз."); }
  }

  return <div className="page-stack">
    {loadError && <p className="inline-notice" role="alert">{loadError}</p>}
    <header className="task-heading"><div><p className="eyebrow">ВАЖНОЕ В НУЖНЫЙ МОМЕНТ</p><h1>Напоминания</h1><p className="page-subtitle">Запланируйте, когда DAYFLOW должен напомнить о задаче.</p></div><div className="task-count"><strong>{reminders.length}</strong><span>запланировано</span></div></header>
    <div className="task-layout">
      <form className="task-composer" onSubmit={create}>
        <h2>Новое напоминание</h2>
        <label>Найти задачу по названию<input value={taskSearch} onChange={(event) => { setTaskSearch(event.target.value); setTaskId(""); }} placeholder="Начните вводить название задачи" /><VoiceInput value={taskSearch} onChange={(value) => { setTaskSearch(value); setTaskId(""); }} label="Надиктовать название задачи" /></label>
        <label>Задача<select value={taskId} onChange={(event) => setTaskId(event.target.value)} required disabled={!filteredTasks.length}><option value="" disabled>Выберите задачу</option>{filteredTasks.map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label>
        <label>Дата и время<input type="datetime-local" value={remindAt} min={localDateTime(new Date().toISOString())} onChange={(event) => setRemindAt(event.target.value)} required /></label>
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
        <button className="button button-primary" disabled={busy || !taskId || !remindAt}>{busy ? "Сохраняю…" : "Запланировать"}</button>
        {!tasks.length && <p className="form-message">Сначала создайте задачу в разделе «Задачи».</p>}
        {tasks.length > 0 && !filteredTasks.length && <p className="form-message">По этому названию задачи не найдены.</p>}
      </form>
      <section className="task-list-wrap"><div className="task-list-heading"><h2>Предстоящие</h2><span>{reminders.length}</span></div><div className="task-list">{!reminders.length ? <div className="task-empty">Пока нет запланированных напоминаний.</div> : reminders.map((reminder) => <article className="task-card" key={reminder.id}><div className="task-card-body"><div className="task-card-top"><h3>{tasks.find((task) => task.id === reminder.task_id)?.title ?? "Задача"}</h3><span className="task-deadline">{new Date(reminder.remind_at).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}</span></div><div className="task-actions"><button type="button" className="text-button text-button--danger" onClick={() => void cancel(reminder.id)}>Отменить</button></div></div></article>)}</div></section>
    </div>
    <p className="inline-notice">Сейчас здесь сохраняется расписание напоминаний. Автоматическая доставка push-уведомлений или писем будет подключена отдельным фоновым сервисом.</p>
  </div>;
}
