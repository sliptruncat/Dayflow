export type BudgetPeriod = "weekly" | "monthly" | "yearly";
export type BudgetWindow = { start: string; endExclusive: string };
export type BudgetForUsage = {
  amount: number | string;
  currency: string;
  period: BudgetPeriod;
  starts_on: string;
  category_id: string | null;
};
export type TransactionForUsage = {
  amount: number | string;
  currency: string;
  kind: "income" | "expense";
  occurred_on: string;
  category_id: string | null;
};

function dateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function parseDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) && dateKey(date) === value ? date : null;
}

function dateAtMonth(year: number, monthIndex: number, day: number) {
  const first = new Date(Date.UTC(year, monthIndex, 1, 12));
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0, 12)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return first;
}

function dateAtYear(year: number, monthIndex: number, day: number) {
  return dateAtMonth(year, monthIndex, day);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Returns the current recurring budget window, using inclusive start and exclusive end dates. */
export function getBudgetWindow(startsOn: string, period: BudgetPeriod, today: string): BudgetWindow | null {
  const anchor = parseDate(startsOn);
  const current = parseDate(today);
  if (!anchor || !current || current < anchor) return null;

  if (period === "weekly") {
    const elapsedDays = Math.floor((current.getTime() - anchor.getTime()) / 86_400_000);
    const start = addDays(anchor, Math.floor(elapsedDays / 7) * 7);
    return { start: dateKey(start), endExclusive: dateKey(addDays(start, 7)) };
  }

  if (period === "monthly") {
    let months = (current.getUTCFullYear() - anchor.getUTCFullYear()) * 12
      + current.getUTCMonth() - anchor.getUTCMonth();
    let start = dateAtMonth(anchor.getUTCFullYear(), anchor.getUTCMonth() + months, anchor.getUTCDate());
    if (start > current) {
      months -= 1;
      start = dateAtMonth(anchor.getUTCFullYear(), anchor.getUTCMonth() + months, anchor.getUTCDate());
    }
    const end = dateAtMonth(anchor.getUTCFullYear(), anchor.getUTCMonth() + months + 1, anchor.getUTCDate());
    return { start: dateKey(start), endExclusive: dateKey(end) };
  }

  let years = current.getUTCFullYear() - anchor.getUTCFullYear();
  let start = dateAtYear(anchor.getUTCFullYear() + years, anchor.getUTCMonth(), anchor.getUTCDate());
  if (start > current) {
    years -= 1;
    start = dateAtYear(anchor.getUTCFullYear() + years, anchor.getUTCMonth(), anchor.getUTCDate());
  }
  const end = dateAtYear(anchor.getUTCFullYear() + years + 1, anchor.getUTCMonth(), anchor.getUTCDate());
  return { start: dateKey(start), endExclusive: dateKey(end) };
}

export function calculateBudgetUsage(
  budget: BudgetForUsage,
  transactions: TransactionForUsage[],
  today: string,
) {
  const window = getBudgetWindow(budget.starts_on, budget.period, today);
  const spent = window ? transactions.reduce((total, transaction) => {
    if (
      transaction.kind !== "expense" ||
      transaction.currency !== budget.currency ||
      transaction.occurred_on < window.start ||
      transaction.occurred_on >= window.endExclusive ||
      (budget.category_id !== null && transaction.category_id !== budget.category_id)
    ) return total;
    return total + Number(transaction.amount);
  }, 0) : 0;
  const amount = Number(budget.amount);
  return {
    window,
    spent,
    remaining: amount - spent,
    percent: amount > 0 ? Math.round((spent / amount) * 100) : 0,
  };
}
