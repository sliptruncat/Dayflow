export type CalendarDay = { key: string; day: number; inMonth: boolean };

function pad(value: number) { return String(value).padStart(2, "0"); }
export function dateKey(year: number, month: number, day: number) { return `${year}-${pad(month + 1)}-${pad(day)}`; }

export function monthGrid(year: number, month: number): CalendarDay[] {
  const first = new Date(Date.UTC(year, month, 1));
  const leading = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - leading));
  const cells = Math.ceil((leading + new Date(Date.UTC(year, month + 1, 0)).getUTCDate()) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + index);
    return { key: dateKey(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()), day: current.getUTCDate(), inMonth: current.getUTCMonth() === month };
  });
}

export function shiftMonth(year: number, month: number, offset: number) {
  const next = new Date(Date.UTC(year, month + offset, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
}
export function weekKeys(anchor: string) { const current = new Date(`${anchor}T12:00:00Z`); current.setUTCDate(current.getUTCDate() - ((current.getUTCDay() + 6) % 7)); return Array.from({ length: 7 }, (_, index) => { const day = new Date(current); day.setUTCDate(current.getUTCDate() + index); return day.toISOString().slice(0, 10); }); }
export function yearMonths(year: number) { return Array.from({ length: 12 }, (_, month) => ({ year, month, days: monthGrid(year, month).filter((day) => day.inMonth) })); }

export function dateKeyInTimeZone(value: Date | string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function dateTimeInputInTimeZone(value: string | null, timeZone: string) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function zonedDateTimeToIso(value: string, timeZone: string) {
  if (!value) return null;
  const [date, time = "00:00"] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  const offsetAt = (instant: number) => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);
    return Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute")) - instant;
  };
  let instant = target - offsetAt(target);
  instant = target - offsetAt(instant);
  return new Date(instant).toISOString();
}

export function tasksByDeadline<T extends { deadline_at: string | null }>(tasks: T[], timeZone: string) {
  return tasks.reduce<Record<string, T[]>>((grouped, task) => {
    if (!task.deadline_at) return grouped;
    const key = dateKeyInTimeZone(task.deadline_at, timeZone);
    (grouped[key] ??= []).push(task);
    return grouped;
  }, {});
}

export function eventsByDate<T extends { starts_at: string; ends_at: string; is_all_day: boolean }>(events: T[], timeZone: string) {
  return events.reduce<Record<string, T[]>>((grouped, event) => {
    const start = dateKeyInTimeZone(event.starts_at, timeZone);
    const endInstant = event.is_all_day ? new Date(new Date(event.ends_at).getTime() - 1) : new Date(event.ends_at);
    const end = dateKeyInTimeZone(endInstant, timeZone);
    const cursor = new Date(`${start}T12:00:00Z`); const last = new Date(`${end}T12:00:00Z`);
    while (cursor <= last) { const key = cursor.toISOString().slice(0, 10); (grouped[key] ??= []).push(event); cursor.setUTCDate(cursor.getUTCDate() + 1); }
    return grouped;
  }, {});
}
