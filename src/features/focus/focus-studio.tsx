"use client";

import { useEffect, useRef, useState } from "react";
import { focusChannelName, focusStorageKey, mergeFocusSessions, readFocusSyncSession } from "@/lib/focus-sync";
import type { Database } from "@/types/database";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Session = Database["public"]["Tables"]["focus_sessions"]["Row"];
type Progress = Database["public"]["Tables"]["user_progress"]["Row"] | null;

const stages = {
  egg: ["🥚", "Яйцо", "Ещё немного заботы — и он появится."],
  hatchling: ["🦕", "Малыш", "Ваш ритм уже заметен."],
  juvenile: ["🦖", "Подросток", "Он растёт вместе с вашим фокусом."],
  adult: ["🐉", "Взрослый", "Спокойная сила привычки."],
} as const;

function getElapsedSeconds(session: Session, now = Date.now()) {
  const saved = session.elapsed_seconds ?? 0;
  if (session.status !== "running") return saved;
  const sinceStart = Math.max(0, Math.floor((now - new Date(session.started_at).getTime()) / 1000));
  return Math.min(session.duration_seconds, saved + sinceStart);
}

export function FocusStudio({
  initialProgress,
  initialSessions,
  tasks,
  achievements,
  ownerId,
}: {
  initialProgress: Progress;
  initialSessions: Session[];
  tasks: Task[];
  achievements: Database["public"]["Tables"]["user_achievements"]["Row"][];
  ownerId: string;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [sessions, setSessions] = useState(initialSessions);
  const [duration, setDuration] = useState(25 * 60);
  const [taskId, setTaskId] = useState("");
  const [active, setActive] = useState<Session | null>(
    initialSessions.find((item) => item.status === "running" || item.status === "paused") ?? null,
  );
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string>();
  const channelRef = useRef<BroadcastChannel | null>(null);
  const remaining = Math.max(0, (active?.duration_seconds ?? duration) - elapsed);
  const stage = stages[progress?.companion_stage ?? "egg"];

  useEffect(() => {
    if (!ownerId) return;
    const storageKey = focusStorageKey(ownerId);
    const applySession = (session: Session) => {
      setSessions((current) => mergeFocusSessions(current, session));
      setActive((current) => {
        if (session.status === "running" || session.status === "paused") return session;
        return current?.id === session.id ? null : current;
      });
    };
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(focusChannelName(ownerId)) : null;
    if (channel) {
      channel.onmessage = (event: MessageEvent<unknown>) => {
        const session = readFocusSyncSession(event.data, ownerId);
        if (session) applySession(session);
      };
      channelRef.current = channel;
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      try {
        const session = readFocusSyncSession(JSON.parse(event.newValue), ownerId);
        if (session) applySession(session);
      } catch {
        // Ignore malformed messages; the persisted server session remains authoritative.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      channel?.close();
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [ownerId]);

  function publishSession(session: Session) {
    if (!ownerId || session.owner_id !== ownerId) return;
    const message = { type: "session-updated", session, nonce: `${Date.now()}-${Math.random()}` };
    if (channelRef.current) {
      channelRef.current.postMessage(message);
      return;
    }
    try {
      window.localStorage.setItem(focusStorageKey(ownerId), JSON.stringify(message));
    } catch {
      // Cross-tab sync is best-effort when browser messaging and local storage are unavailable.
    }
  }

  // The timer is derived from persisted timestamps, so navigation and reloads never reset elapsed time.
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const update = () => setElapsed(getElapsedSeconds(active));
    update();
    if (active.status !== "running") return;
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [active]);

  async function request(url: string, method: "POST" | "PATCH", body: unknown) {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(json?.error ?? "Не удалось сохранить сессию.");
    return json;
  }

  async function start() {
    setError(undefined);
    try {
      const { session } = await request("/api/focus", "POST", {
        duration_seconds: duration,
        task_id: taskId || null,
      });
      setActive(session);
      setElapsed(0);
      setSessions((current) => mergeFocusSessions(current, session));
      publishSession(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось начать фокус.");
    }
  }

  async function save(status: "running" | "paused" | "completed" | "cancelled") {
    if (!active) return;
    setError(undefined);
    const actualElapsed = getElapsedSeconds(active);
    const body = {
      status,
      elapsed_seconds: actualElapsed,
      ...(status === "running" ? { started_at: new Date().toISOString(), completed_at: null } : {}),
      ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
      ...(status === "paused" || status === "cancelled" ? { completed_at: null } : {}),
    };
    try {
      const { session } = await request(`/api/focus/${active.id}`, "PATCH", body);
      setSessions((current) => mergeFocusSessions(current, session));
      setActive(status === "completed" || status === "cancelled" ? null : session);
      setElapsed(actualElapsed);
      publishSession(session);
      if (status === "completed") {
        setProgress((current) => current ? {
          ...current,
          xp_total: current.xp_total + Math.max(10, Math.floor(actualElapsed / 60)),
        } : current);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось обновить сессию.");
    }
  }

  const clock = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const xpProgress = (progress?.xp_total ?? 0) % 100;

  return (
    <section className="page-stack focus-studio">
      <header className="focus-hero">
        <div className="companion" data-stage={progress?.companion_stage ?? "egg"}>
          <span>{stage[0]}</span>
          <div>
            <p className="eyebrow">ВАШ КОМПАНЬОН · {stage[1]}</p>
            <h1>{progress?.level ?? 1} уровень · {progress?.xp_total ?? 0} XP</h1>
            <p>{stage[2]}</p>
            <progress value={xpProgress} max="100" />
          </div>
        </div>
        <div className="streak"><strong>{progress?.current_streak ?? 0}</strong><span>дней в ритме</span></div>
      </header>

      <div className="focus-layout">
        <section className="timer-card">
          <p className="eyebrow">FOCUS TIMER</p>
          <output aria-live="polite">{clock}</output>
          {!active && (
            <>
              <div className="timer-presets">
                {[15, 25, 45, 60].map((minutes) => (
                  <button key={minutes} className={duration === minutes * 60 ? "is-active" : ""} onClick={() => setDuration(minutes * 60)}>{minutes} мин</button>
                ))}
              </div>
              <label>Задача
                <select value={taskId} onChange={(event) => setTaskId(event.target.value)}>
                  <option value="">Без привязки</option>
                  {tasks.filter((task) => task.status !== "completed").map((task) => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
                </select>
              </label>
              <button className="button button--accent" onClick={() => void start()}>Начать фокус</button>
            </>
          )}
          {active && (
            <div className="timer-actions">
              {active.status === "running"
                ? <button className="button" onClick={() => void save("paused")}>Пауза</button>
                : <button className="button" onClick={() => void save("running")}>Продолжить</button>}
              <button className="text-button" onClick={() => void save("completed")}>Завершить</button>
              <button className="text-button text-button--danger" onClick={() => void save("cancelled")}>Отменить</button>
            </div>
          )}
          {active?.status === "running" && <p className="timer-persistence-note">Сессия синхронизируется между разделами, вкладками и окнами.</p>}
          {error && <p className="form-message form-message--error">{error}</p>}
        </section>

        <aside className="achievement-card">
          <p className="eyebrow">НАГРАДЫ</p>
          <h2>{achievements.length} открыто</h2>
          <div className="achievement-list">
            {["first_step", "ten_tasks", "focus_friend", "seven_day_rhythm", "level_five"].map((code) => (
              <span key={code} className={achievements.some((item) => item.code === code) ? "unlocked" : ""}>
                {achievements.some((item) => item.code === code) ? "✦" : "○"}{" "}
                {({ first_step: "Первый шаг", ten_tasks: "Десять дел", focus_friend: "Друг фокуса", seven_day_rhythm: "Ритм недели", level_five: "Пятый уровень" })[code]}
              </span>
            ))}
          </div>
        </aside>
      </div>

      <section className="focus-history">
        <h2>История фокуса</h2>
        {sessions.length ? (
          <div>
            {sessions.slice(0, 8).map((session) => (
              <article key={session.id}>
                <b>{Math.round(session.elapsed_seconds / 60)} мин</b>
                <span>{session.status === "completed" ? "Завершено" : session.status === "paused" ? "На паузе" : session.status === "running" ? "В процессе" : "Не завершено"}</span>
                <time>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(session.started_at))}</time>
              </article>
            ))}
          </div>
        ) : <p>Первая сессия появится здесь.</p>}
      </section>
    </section>
  );
}
