"use client";

import Link from "next/link";
import { useState } from "react";
import { VoiceInput } from "@/components/voice-input";

const starters = [
  { label: "Разобрать большую задачу", prompt: "Помоги разбить эту задачу на небольшие конкретные шаги: " },
  { label: "Спланировать неделю", prompt: "Помоги составить реалистичный план недели с учётом приоритетов: " },
  { label: "Сформулировать цель", prompt: "Помоги сформулировать измеримую цель и критерии результата: " },
];

export function AssistantWorkspace() {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveToInbox() {
    const text = prompt.trim();
    if (!text) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/inbox", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text.slice(0, 120), body: text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Не удалось сохранить запрос.");
      setMessage("Запрос сохранён во «Входящих». Вы сможете вернуться к нему позже.");
      setPrompt("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Произошла ошибка.");
    } finally { setBusy(false); }
  }

  return (
    <div className="page-stack">
      <header className="task-heading"><div><p className="eyebrow">DAYFLOW / ПОМОЩНИК</p><h1>Помощник по планированию</h1><p className="page-subtitle">Сформулируйте мысль или задачу. Сохраните её во входящих, чтобы не потерять.</p></div><div className="task-count"><strong>В</strong><span>ранний доступ</span></div></header>
      <section className="assistant-panel">
        <div className="assistant-panel-heading"><span className="assistant-orb" aria-hidden="true">✦</span><div><h2>С чего начнём?</h2><p>Выберите заготовку или напишите свой запрос.</p></div></div>
        <div className="assistant-starters">{starters.map((item) => <button type="button" key={item.label} onClick={() => setPrompt(item.prompt)}>{item.label}<span aria-hidden="true">↗</span></button>)}</div>
        <label className="assistant-input-label" htmlFor="assistant-prompt">Ваш запрос</label>
        <textarea id="assistant-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Например: хочу закончить курсовую за две недели, но не понимаю, с чего начать..." rows={6} maxLength={10000} />
        <VoiceInput value={prompt} onChange={setPrompt} label="Надиктовать запрос помощнику" />
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
        {message && <p className="form-message" role="status">{message} <Link href="/inbox">Открыть входящие</Link></p>}
        <div className="assistant-submit-row"><p>Подключение AI-модели появится после настройки серверного ключа OpenAI. Пока можно сохранить запрос во «Входящие»: он не потеряется, а DAYFLOW не будет выдавать обычный шаблон за ответ ИИ.</p><button className="button button-primary" type="button" disabled={busy || !prompt.trim()} onClick={() => void saveToInbox()}>{busy ? "Сохраняю…" : "Сохранить во входящие"}</button></div>
      </section>
      <div className="assistant-safety"><strong>Ваш контроль остаётся у вас.</strong><span>DAYFLOW не будет создавать, менять или удалять задачи без вашего подтверждения.</span></div>
    </div>
  );
}
