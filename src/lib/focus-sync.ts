import type { Database } from "@/types/database";

export type FocusSession = Database["public"]["Tables"]["focus_sessions"]["Row"];
export const focusChannelName = (ownerId: string) => `dayflow-focus-session:${ownerId}`;
export const focusStorageKey = (ownerId: string) => `dayflow-focus-session-update:${ownerId}`;

export function readFocusSyncSession(value: unknown, ownerId: string): FocusSession | null {
  if (typeof value !== "object" || value === null) return null;
  const message = value as Record<string, unknown>;
  if (message.type !== "session-updated" || typeof message.session !== "object" || message.session === null) return null;
  const session = message.session as Record<string, unknown>;
  if (
    typeof session.id !== "string" ||
    session.owner_id !== ownerId ||
    typeof session.started_at !== "string" ||
    typeof session.duration_seconds !== "number" ||
    typeof session.elapsed_seconds !== "number" ||
    !["running", "paused", "completed", "cancelled"].includes(String(session.status))
  ) return null;
  return session as unknown as FocusSession;
}

export function mergeFocusSessions<T extends { id: string; started_at: string }>(sessions: T[], incoming: T): T[] {
  const byId = new Map<string, T>();
  for (const session of sessions) byId.set(session.id, session);
  byId.set(incoming.id, incoming);
  return [...byId.values()].sort((left, right) => Date.parse(right.started_at) - Date.parse(left.started_at));
}
