"use client";

import { useState } from "react";
import { VoiceInput } from "@/components/voice-input";

export function TodayQuickCapture({ configured }: { configured: boolean }) {
  const [textValue, setTextValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    const text = textValue.trim();
    if (!text || !configured) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/inbox", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text.slice(0, 120), body: text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Не удалось сохранить запись.");
      setTextValue(""); setMessage("Запись сохранена во «Входящих».");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось сохранить запись.");
    } finally { setBusy(false); }
  }

  return <article className="feature-card today-capture">
    <span className="card-kicker">БЫСТРАЯ ЗАПИСЬ</span>
    <h2>Запишите мысль, пока она не потерялась</h2>
    <textarea aria-label="Новая мысль или задача" value={textValue} onChange={(event) => setTextValue(event.target.value)} placeholder="Что важно не забыть сегодня?" rows={3} maxLength={10000} disabled={!configured} />
    <VoiceInput value={textValue} onChange={setTextValue} label="Надиктовать запись" />
    <div className="today-capture-actions"><button className="button button-primary" type="button" disabled={!configured || busy || !textValue.trim()} onClick={() => void save()}>{busy ? "Сохраняю…" : "Сохранить во входящие"}</button>{message && <span role="status">{message}</span>}</div>
  </article>;
}
