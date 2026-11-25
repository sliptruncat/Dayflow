export type HealthTrendEntry = {
  entry_date: string;
  sleep_minutes: number | string | null;
  mood: number | string | null;
  energy: number | string | null;
};

function average(values: Array<number | string | null>) {
  const present = values.filter((value): value is number | string => value !== null).map(Number).filter(Number.isFinite);
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
}

/** Summarizes only the latest seven entries; it does not infer or diagnose health conditions. */
export function summarizeHealthEntries(entries: HealthTrendEntry[]) {
  const latest = entries.slice(0, 7);
  return {
    recent: [...latest].reverse(),
    count: latest.length,
    averageSleepMinutes: average(latest.map((entry) => entry.sleep_minutes)),
    averageMood: average(latest.map((entry) => entry.mood)),
    averageEnergy: average(latest.map((entry) => entry.energy)),
  };
}
