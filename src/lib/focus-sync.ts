export function mergeFocusSessions<T extends { id: string; started_at: string }>(sessions: T[], incoming: T): T[] {
  const byId = new Map(sessions.map((session) => [session.id, session]));
  byId.set(incoming.id, incoming);
  return [...byId.values()].sort((left, right) => Date.parse(right.started_at) - Date.parse(left.started_at));
}
