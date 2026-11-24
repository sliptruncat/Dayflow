"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { focusChannelName, focusStorageKey, focusSyncEventName, readFocusSyncSession, type FocusSession } from "@/lib/focus-sync";

function remainingSeconds(session: FocusSession, now: number) {
  const elapsed = session.status === "running"
    ? session.elapsed_seconds + Math.max(0, Math.floor((now - new Date(session.started_at).getTime()) / 1000))
    : session.elapsed_seconds;
  return Math.max(0, session.duration_seconds - elapsed);
}

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function FocusMiniTimer({ ownerId }: { ownerId: string }) {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!ownerId) return;
    let mounted = true;
    let receivedSyncUpdate = false;
    const applySession = (incoming: FocusSession) => {
      receivedSyncUpdate = true;
      setSession((current) => {
        if (incoming.status === "running" || incoming.status === "paused") return incoming;
        return current?.id === incoming.id ? null : current;
      });
    };

    async function loadActiveSession() {
      try {
        const response = await fetch("/api/focus", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (mounted && !receivedSyncUpdate) setSession(payload.session?.owner_id === ownerId ? payload.session : null);
      } catch {
        // The focus timer continues from its persisted timestamp; retry on the next navigation.
      }
    }
    void loadActiveSession();

    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(focusChannelName(ownerId)) : null;
    if (channel) channel.onmessage = (event: MessageEvent<unknown>) => {
      const incoming = readFocusSyncSession(event.data, ownerId);
      if (incoming) applySession(incoming);
    };

    const onLocalSync = (event: Event) => {
      const incoming = readFocusSyncSession((event as CustomEvent<unknown>).detail, ownerId);
      if (incoming) applySession(incoming);
    };
    window.addEventListener(focusSyncEventName, onLocalSync);

    const storageKey = focusStorageKey(ownerId);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      try {
        const incoming = readFocusSyncSession(JSON.parse(event.newValue), ownerId);
        if (incoming) applySession(incoming);
      } catch {
        // Ignore malformed cross-tab messages.
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(focusSyncEventName, onLocalSync);
      channel?.close();
    };
  }, [ownerId]);

  useEffect(() => {
    if (!session || session.status !== "running") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  if (!session) return null;
  const remaining = remainingSeconds(session, now);
  return (
    <Link className="focus-mini-timer" href="/focus" aria-label="Открыть Focus таймер">
      <span className="focus-mini-timer__dot" aria-hidden="true" />
      <span>{session.status === "paused" ? "Фокус на паузе" : "Фокус"}</span>
      <strong>{formatTime(remaining)}</strong>
    </Link>
  );
}
