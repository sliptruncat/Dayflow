import { zonedDateTimeToIso } from "./calendar-month";

export type ScheduleEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  is_all_day: boolean;
};
export type ScheduleSegment<T extends ScheduleEvent> = { event: T; startsHere: boolean };
export type ScheduleHour<T extends ScheduleEvent> = { key: string; label: string; startsAt: string; endsAt: string; events: ScheduleSegment<T>[] };

function nextDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Real elapsed-hour slots: 23/24/25 around daylight-saving transitions. */
export function scheduleHoursForDate<T extends ScheduleEvent>(dateKey: string, timeZone: string, events: T[]): ScheduleHour<T>[] {
  const start = zonedDateTimeToIso(`${dateKey}T00:00`, timeZone);
  const end = zonedDateTimeToIso(`${nextDateKey(dateKey)}T00:00`, timeZone);
  if (!start || !end) return [];
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return [];
  const formatter = new Intl.DateTimeFormat("ru-RU", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const slots: ScheduleHour<T>[] = [];
  for (let cursor = startMs; cursor < endMs; cursor += 60 * 60 * 1000) {
    const slotEnd = Math.min(cursor + 60 * 60 * 1000, endMs);
    slots.push({
      key: new Date(cursor).toISOString(),
      label: formatter.format(new Date(cursor)),
      startsAt: new Date(cursor).toISOString(),
      endsAt: new Date(slotEnd).toISOString(),
      events: events
        .filter((event) => !event.is_all_day && Date.parse(event.starts_at) < slotEnd && Date.parse(event.ends_at) > cursor)
        .map((event) => ({ event, startsHere: Date.parse(event.starts_at) >= cursor && Date.parse(event.starts_at) < slotEnd })),
    });
  }
  return slots;
}
