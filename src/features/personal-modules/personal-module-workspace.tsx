"use client";
import { useCallback, useEffect, useState } from "react";
import { calculateBudgetUsage, type BudgetPeriod, type TransactionForUsage } from "@/lib/finance-budget";
type ModuleKind = "finance" | "contacts" | "health";
type Row = Record<string, string | number | boolean | null>;
const endpoints: Record<ModuleKind, string> = { finance: "/api/finance/transactions", contacts: "/api/contacts", health: "/api/health/entries" };
const collectionKeys: Record<ModuleKind, string> = { finance: "transactions", contacts: "contacts", health: "entries" };

type FinanceCategory = { id: string; name: string; kind: "income" | "expense"; color: string };
type FinanceBudget = { id: string; name: string; amount: number; currency: string; period: BudgetPeriod; starts_on: string; category_id: string | null };
type FinanceTransaction = TransactionForUsage & { id: string; title: string };

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateKey(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00.000Z`));
}

export function PersonalModuleWorkspace({ kind }: { kind: ModuleKind }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [financeCategories, setFinanceCategories] = useState<FinanceCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [moneyKind, setMoneyKind] = useState<"expense" | "income">("expense");
  const [currency, setCurrency] = useState("RUB");
  const [occurredOn, setOccurredOn] = useState(localDateKey());
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const [entryDate, setEntryDate] = useState(localDateKey());
  const [sleep, setSleep] = useState("");
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(endpoints[kind], { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Не удалось загрузить данные.");
      setRows(payload[collectionKeys[kind]] ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ошибка загрузки."); }
    finally { setLoading(false); }
  }, [kind]);
  useEffect(() => { void load(); }, [load]);

  function resetForm() {
    setEditingId(null); setTitle(""); setAmount(""); setMoneyKind("expense"); setCurrency("RUB"); setCategoryId("");
    setOccurredOn(localDateKey()); setFullName(""); setCompany(""); setRole("");
    setEmail(""); setPhone(""); setContactNotes(""); setEntryDate(localDateKey());
    setSleep(""); setMood(""); setEnergy(""); setNotes("");
  }

  function beginEdit(row: Row) {
    setEditingId(String(row.id)); setError(""); setMessage("");
    if (kind === "finance") {
      setTitle(String(row.title ?? "")); setAmount(String(row.amount ?? "")); setMoneyKind(row.kind === "income" ? "income" : "expense");
      setCurrency(String(row.currency ?? "RUB")); setOccurredOn(String(row.occurred_on ?? "")); setCategoryId(String(row.category_id ?? ""));
    } else if (kind === "contacts") {
      setFullName(String(row.full_name ?? "")); setCompany(String(row.company ?? "")); setRole(String(row.role ?? ""));
      setEmail(String(row.email ?? "")); setPhone(String(row.phone ?? "")); setContactNotes(String(row.notes ?? ""));
    } else {
      setEntryDate(String(row.entry_date ?? "")); setSleep(row.sleep_minutes == null ? "" : String(row.sleep_minutes));
      setMood(row.mood == null ? "" : String(row.mood)); setEnergy(row.energy == null ? "" : String(row.energy));
      setNotes(String(row.notes ?? ""));
    }
  }

  async function removeRow(id: string) {
    if (!window.confirm("Удалить эту запись? Действие нельзя отменить.")) return;
    setError(""); setMessage("");
    try {
      const response = await fetch(`${endpoints[kind]}/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Не удалось удалить запись.");
      if (editingId === id) resetForm();
      setMessage("Запись удалена."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ошибка удаления."); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    let body: Record<string, unknown>;
    if (kind === "finance") body = { title, amount: Number(amount), currency, kind: moneyKind, occurred_on: occurredOn, category_id: categoryId || null };
    else if (kind === "contacts") body = { full_name: fullName, company, role, email, phone, notes: contactNotes };
    else body = { entry_date: entryDate, sleep_minutes: sleep === "" ? null : Number(sleep), mood: mood === "" ? null : Number(mood), energy: energy === "" ? null : Number(energy), notes };
    try {
      const response = await fetch(editingId ? `${endpoints[kind]}/${editingId}` : endpoints[kind], {
        method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Не удалось сохранить запись.");
      setMessage(editingId ? "Изменения сохранены." : "Сохранено.");
      resetForm(); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ошибка сохранения."); }
    finally { setSaving(false); }
  }

  const heading = kind === "finance" ? "Финансы" : kind === "contacts" ? "Контакты" : "Здоровье";
  const description = kind === "finance" ? "Фиксируйте доходы и расходы. Данные доступны только в вашем аккаунте." : kind === "contacts" ? "Собирайте важные контакты и сохраняйте контекст общения." : "Личный дневник самочувствия. Заполняйте только те показатели, которыми хотите делиться с DAYFLOW.";
  return <><section className="page-stack personal-module">
    <header className="page-heading"><p className="eyebrow">DAYFLOW / ЛИЧНОЕ ПРОСТРАНСТВО</p><h1>{heading}</h1><p>{description}</p></header>
    <div className="personal-module-grid">
      <form className="personal-module-form" onSubmit={submit}>
        <p className="eyebrow">{editingId ? "РЕДАКТИРОВАНИЕ" : "НОВАЯ ЗАПИСЬ"}</p>
        {kind === "finance" && <>
          <label>Название<input required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} placeholder="Например, продукты" /></label>
          <div className="personal-module-fields"><label>Сумма<input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></label><label>Валюта<select value={currency} onChange={e => setCurrency(e.target.value)}><option value="RUB">RUB</option><option value="EUR">EUR</option><option value="USD">USD</option></select></label></div>
          <label>Тип операции<select value={moneyKind} onChange={e => { setMoneyKind(e.target.value as "expense" | "income"); setCategoryId(""); }}><option value="expense">Расход</option><option value="income">Доход</option></select></label>
          <label>Категория<select value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">Без категории</option>{financeCategories.filter(category => category.kind === moneyKind).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>Дата<input type="date" value={occurredOn} onChange={e => setOccurredOn(e.target.value)} /></label>
        </>}
        {kind === "contacts" && <>
          <label>Имя и фамилия<input required maxLength={160} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Имя контакта" /></label>
          <label>Компания<input maxLength={160} value={company} onChange={e => setCompany(e.target.value)} placeholder="Компания" /></label>
          <label>Должность<input maxLength={120} value={role} onChange={e => setRole(e.target.value)} placeholder="Должность" /></label>
          <label>Email<input type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></label>
          <label>Телефон<input type="tel" maxLength={40} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 ..." /></label>
          <label>Заметки<textarea maxLength={5000} value={contactNotes} onChange={e => setContactNotes(e.target.value)} placeholder="Контекст и важные детали" /></label>
        </>}
        {kind === "health" && <>
          <label>Дата<input type="date" required value={entryDate} onChange={e => setEntryDate(e.target.value)} /></label>
          <div className="personal-module-fields"><label>Сон, минут<input type="number" min="0" max="1440" value={sleep} onChange={e => setSleep(e.target.value)} placeholder="Например, 480" /></label><label>Настроение<select value={mood} onChange={e => setMood(e.target.value)}><option value="">Не указывать</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></label></div>
          <label>Энергия<select value={energy} onChange={e => setEnergy(e.target.value)}><option value="">Не указывать</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></label>
          <label>Заметка<textarea maxLength={3000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Как вы себя чувствуете?" /></label>
        </>}
        <div className="personal-module-form-actions">
          <button className="button button--accent" type="submit" disabled={saving}>{saving ? "Сохраняем…" : editingId ? "Сохранить изменения" : "Сохранить"}</button>
          {editingId && <button className="text-button" type="button" onClick={resetForm}>Отменить</button>}
        </div>
        <p className="settings-save-message" role="status">{message}</p>
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      </form>
      <div className="personal-module-list">
        <div className="personal-module-list-heading"><div><p className="eyebrow">ВАША ИСТОРИЯ</p><h2>{kind === "health" ? "Дневник" : kind === "contacts" ? "Люди" : "Операции"}</h2></div><button className="text-button" type="button" onClick={() => void load()}>Обновить</button></div>
        {loading ? <p className="personal-module-empty">Загружаем записи…</p> : rows.length === 0 ? <p className="personal-module-empty">Пока записей нет. Добавьте первую — она появится здесь.</p> : <ul className="personal-module-items">{rows.map(row => <li key={String(row.id)}>
          {kind === "finance" && <><strong>{String(row.title)}</strong><span>{String(row.kind) === "income" ? "+" : "−"}{Number(row.amount).toLocaleString("ru-RU")} {String(row.currency)}</span><small>{String(row.occurred_on)} · {financeCategories.find(category => category.id === row.category_id)?.name ?? "Без категории"}</small></>}
          {kind === "contacts" && <><strong>{String(row.full_name)}</strong><span>{[row.company, row.role].filter(Boolean).join(" · ") || "Контакт"}</span><small>{String(row.email ?? row.phone ?? "")}</small></>}
          {kind === "health" && <><strong>{String(row.entry_date)}</strong><span>{row.sleep_minutes == null ? "Сон не указан" : "Сон: " + Math.floor(Number(row.sleep_minutes)/60) + " ч " + (Number(row.sleep_minutes)%60) + " мин"} · {row.mood == null ? "настроение —" : "настроение " + row.mood + "/5"} · {row.energy == null ? "энергия —" : "энергия " + row.energy + "/5"}</span><small>{String(row.notes ?? "")}</small></>}
          <div className="personal-module-row-actions"><button className="text-button" type="button" onClick={() => beginEdit(row)}>Изменить</button><button className="text-button personal-module-delete" type="button" onClick={() => void removeRow(String(row.id))}>Удалить</button></div>
        </li>)}</ul>}
      </div>
    </div>
  </section>
    {kind === "finance" && <FinancePlanningPanel transactions={rows as unknown as FinanceTransaction[]} onCategoriesChange={setFinanceCategories} />}
    {kind === "contacts" && <ContactHistoryPanel contacts={rows.map(row => ({ id: String(row.id), full_name: String(row.full_name) }))} />}
  </>;
}


function FinancePlanningPanel({ transactions, onCategoriesChange }: { transactions: FinanceTransaction[]; onCategoriesChange: (categories: FinanceCategory[]) => void }) {
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryKind, setCategoryKind] = useState<"income" | "expense">("expense");
  const [budgetName, setBudgetName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("RUB");
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>("monthly");
  const [budgetCategoryId, setBudgetCategoryId] = useState("");
  const [budgetStartsOn, setBudgetStartsOn] = useState(localDateKey());
  const today = localDateKey();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [c, b] = await Promise.all([fetch("/api/finance/categories", { cache: "no-store" }), fetch("/api/finance/budgets", { cache: "no-store" })]);
      const [cp, bp] = await Promise.all([c.json(), b.json()]);
      if (!c.ok || !b.ok) throw new Error(cp.error ?? bp.error ?? "Не удалось загрузить планирование.");
      const nextCategories = cp.categories ?? []; setCategories(nextCategories); onCategoriesChange(nextCategories); setBudgets(bp.budgets ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка загрузки."); }
  }, [onCategoriesChange]);
  useEffect(() => { void load(); }, [load]);
  async function addCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch("/api/finance/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: categoryName, kind: categoryKind }) });
      const p = await r.json(); if (!r.ok) throw new Error(p.error ?? "Не удалось сохранить категорию.");
      setCategoryName(""); setMessage("Категория добавлена."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка сохранения."); } finally { setBusy(false); }
  }
  async function addBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch("/api/finance/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: budgetName, amount: Number(budgetAmount), currency: budgetCurrency, period: budgetPeriod, category_id: budgetCategoryId || null, starts_on: budgetStartsOn }) });
      const p = await r.json(); if (!r.ok) throw new Error(p.error ?? "Не удалось сохранить бюджет.");
      setBudgetName(""); setBudgetAmount(""); setBudgetCategoryId(""); setBudgetStartsOn(localDateKey()); setMessage("Бюджет добавлен."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка сохранения."); } finally { setBusy(false); }
  }
  return <section className="personal-module-planning">
    <div className="personal-module-list-heading"><div><p className="eyebrow">ПЛАНИРОВАНИЕ</p><h2>Категории и бюджеты</h2></div></div>
    <div className="personal-module-grid personal-module-grid--secondary">
      <form className="personal-module-form" onSubmit={addCategory}>
        <strong>Новая категория</strong>
        <label>Название<input required maxLength={80} value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="Например, продукты" /></label>
        <label>Тип<select value={categoryKind} onChange={e => setCategoryKind(e.target.value as "income" | "expense")}><option value="expense">Расход</option><option value="income">Доход</option></select></label>
        <button className="button button--accent" disabled={busy}>Добавить категорию</button>
        <div className="personal-module-chip-list">{categories.map(c => <span key={c.id}>{c.name} · {c.kind === "income" ? "доход" : "расход"}</span>)}</div>
      </form>
      <form className="personal-module-form" onSubmit={addBudget}>
        <strong>Новый бюджет</strong>
        <label>Название<input required maxLength={100} value={budgetName} onChange={e => setBudgetName(e.target.value)} placeholder="Например, ежемесячные расходы" /></label>
        <div className="personal-module-fields"><label>Сумма<input required type="number" min="0.01" step="0.01" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} /></label><label>Валюта<select value={budgetCurrency} onChange={e => setBudgetCurrency(e.target.value)}><option>RUB</option><option>EUR</option><option>USD</option></select></label></div>
        <label>Период<select value={budgetPeriod} onChange={e => setBudgetPeriod(e.target.value as BudgetPeriod)}><option value="weekly">Неделя</option><option value="monthly">Месяц</option><option value="yearly">Год</option></select></label>
        <label>Категория<select value={budgetCategoryId} onChange={e => setBudgetCategoryId(e.target.value)}><option value="">Все расходы</option>{categories.filter(category => category.kind === "expense").map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label>Начало бюджета<input type="date" value={budgetStartsOn} onChange={e => setBudgetStartsOn(e.target.value)} required /></label>
        <button className="button button--accent" disabled={busy}>Создать бюджет</button>
        <ul className="personal-module-items">{budgets.map(b => {
          const usage = calculateBudgetUsage(b, transactions, today);
          const categoryName = categories.find(category => category.id === b.category_id)?.name ?? "Все расходы";
          return <li key={b.id}>
            <strong>{b.name}</strong><span>{Number(b.amount).toLocaleString("ru-RU")} {b.currency}</span>
            <small>{b.period === "weekly" ? "Неделя" : b.period === "yearly" ? "Год" : "Месяц"} · {categoryName}</small>
            {usage.window ? <>
              <div className="finance-budget-progress" role="progressbar" aria-label={`Использовано бюджета «${b.name}»`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, usage.percent))}>
                <span style={{ width: `${Math.min(100, Math.max(0, usage.percent))}%` }} />
              </div>
              <small>{formatDateKey(usage.window.start)} — {formatDateKey(new Date(new Date(`${usage.window.endExclusive}T12:00:00.000Z`).getTime() - 86_400_000).toISOString().slice(0, 10))} · потрачено {usage.spent.toLocaleString("ru-RU")} {b.currency} ({usage.percent}%) · по загруженным операциям · {usage.remaining >= 0 ? `осталось ${usage.remaining.toLocaleString("ru-RU")} ${b.currency}` : `превышение ${Math.abs(usage.remaining).toLocaleString("ru-RU")} ${b.currency}`}</small>
            </> : <small>Бюджет начнёт действовать {formatDateKey(b.starts_on)}</small>}
          </li>;
        })}</ul>
      </form>
    </div>
    {(error || message) && <p className={error ? "form-message form-message--error" : "settings-save-message"} role={error ? "alert" : "status"}>{error || message}</p>}
  </section>;
}

type ContactRow = { id: string; full_name: string };
type Interaction = { id: string; occurred_at: string; channel: string; summary: string };
function ContactHistoryPanel({ contacts }: { contacts: ContactRow[] }) {
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [channel, setChannel] = useState("note");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!contacts.some(c => c.id === contactId)) setContactId(contacts[0]?.id ?? ""); }, [contacts, contactId]);
  const load = useCallback(async () => {
    if (!contactId) { setInteractions([]); return; }
    try {
      const r = await fetch(`/api/contacts/interactions?contact_id=${encodeURIComponent(contactId)}`, { cache: "no-store" });
      const p = await r.json(); if (!r.ok) throw new Error(p.error ?? "Не удалось загрузить историю.");
      setInteractions(p.interactions ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка загрузки."); }
  }, [contactId]);
  useEffect(() => { void load(); }, [load]);
  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const r = await fetch("/api/contacts/interactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_id: contactId, channel, summary }) });
      const p = await r.json(); if (!r.ok) throw new Error(p.error ?? "Не удалось сохранить запись.");
      setSummary(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка сохранения."); } finally { setBusy(false); }
  }
  return <section className="personal-module-planning">
    <div className="personal-module-list-heading"><div><p className="eyebrow">CRM</p><h2>История общения</h2></div></div>
    {contacts.length === 0 ? <p className="personal-module-empty">Сначала добавьте контакт, чтобы вести историю общения.</p> : <div className="personal-module-grid personal-module-grid--secondary">
      <form className="personal-module-form" onSubmit={add}>
        <label>Контакт<select value={contactId} onChange={e => setContactId(e.target.value)}>{contacts.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></label>
        <label>Тип взаимодействия<select value={channel} onChange={e => setChannel(e.target.value)}><option value="note">Заметка</option><option value="call">Звонок</option><option value="meeting">Встреча</option><option value="email">Email</option><option value="message">Сообщение</option></select></label>
        <label>Что обсудили<textarea required maxLength={2000} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Кратко зафиксируйте контекст" /></label>
        <button className="button button--accent" disabled={busy || !contactId}>Добавить в историю</button>
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      </form>
      <div className="personal-module-list"><ul className="personal-module-items">{interactions.length === 0 ? <li><small>История пока пустая.</small></li> : interactions.map(i => <li key={i.id}><strong>{i.channel === "call" ? "Звонок" : i.channel === "meeting" ? "Встреча" : i.channel === "email" ? "Email" : i.channel === "message" ? "Сообщение" : "Заметка"}</strong><span>{new Date(i.occurred_at).toLocaleString("ru-RU")}</span><small>{i.summary}</small></li>)}</ul></div>
    </div>}
  </section>;
}
