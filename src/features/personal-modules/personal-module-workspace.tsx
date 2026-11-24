"use client";
import { useCallback, useEffect, useState } from "react";
type ModuleKind = "finance" | "contacts" | "health";
type Row = Record<string, string | number | boolean | null>;
const endpoints: Record<ModuleKind, string> = { finance: "/api/finance/transactions", contacts: "/api/contacts", health: "/api/health/entries" };
const collectionKeys: Record<ModuleKind, string> = { finance: "transactions", contacts: "contacts", health: "entries" };

export function PersonalModuleWorkspace({ kind }: { kind: ModuleKind }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [moneyKind, setMoneyKind] = useState<"expense" | "income">("expense");
  const [currency, setCurrency] = useState("RUB");
  const [occurredOn, setOccurredOn] = useState(new Date().toLocaleDateString("en-CA"));
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toLocaleDateString("en-CA"));
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
    setEditingId(null); setTitle(""); setAmount(""); setMoneyKind("expense"); setCurrency("RUB");
    setOccurredOn(new Date().toLocaleDateString("en-CA")); setFullName(""); setCompany(""); setRole("");
    setEmail(""); setPhone(""); setContactNotes(""); setEntryDate(new Date().toLocaleDateString("en-CA"));
    setSleep(""); setMood(""); setEnergy(""); setNotes("");
  }

  function beginEdit(row: Row) {
    setEditingId(String(row.id)); setError(""); setMessage("");
    if (kind === "finance") {
      setTitle(String(row.title ?? "")); setAmount(String(row.amount ?? "")); setMoneyKind(row.kind === "income" ? "income" : "expense");
      setCurrency(String(row.currency ?? "RUB")); setOccurredOn(String(row.occurred_on ?? ""));
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
    if (kind === "finance") body = { title, amount: Number(amount), currency, kind: moneyKind, occurred_on: occurredOn };
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
  return <section className="page-stack personal-module">
    <header className="page-heading"><p className="eyebrow">DAYFLOW / ЛИЧНОЕ ПРОСТРАНСТВО</p><h1>{heading}</h1><p>{description}</p></header>
    <div className="personal-module-grid">
      <form className="personal-module-form" onSubmit={submit}>
        <p className="eyebrow">{editingId ? "РЕДАКТИРОВАНИЕ" : "НОВАЯ ЗАПИСЬ"}</p>
        {kind === "finance" && <>
          <label>Название<input required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} placeholder="Например, продукты" /></label>
          <div className="personal-module-fields"><label>Сумма<input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></label><label>Валюта<select value={currency} onChange={e => setCurrency(e.target.value)}><option value="RUB">RUB</option><option value="EUR">EUR</option><option value="USD">USD</option></select></label></div>
          <label>Тип операции<select value={moneyKind} onChange={e => setMoneyKind(e.target.value as "expense" | "income")}><option value="expense">Расход</option><option value="income">Доход</option></select></label>
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
          {kind === "finance" && <><strong>{String(row.title)}</strong><span>{String(row.kind) === "income" ? "+" : "−"}{Number(row.amount).toLocaleString("ru-RU")} {String(row.currency)}</span><small>{String(row.occurred_on)}</small></>}
          {kind === "contacts" && <><strong>{String(row.full_name)}</strong><span>{[row.company, row.role].filter(Boolean).join(" · ") || "Контакт"}</span><small>{String(row.email ?? row.phone ?? "")}</small></>}
          {kind === "health" && <><strong>{String(row.entry_date)}</strong><span>{row.sleep_minutes == null ? "Сон не указан" : "Сон: " + Math.floor(Number(row.sleep_minutes)/60) + " ч " + (Number(row.sleep_minutes)%60) + " мин"} · {row.mood == null ? "настроение —" : "настроение " + row.mood + "/5"} · {row.energy == null ? "энергия —" : "энергия " + row.energy + "/5"}</span><small>{String(row.notes ?? "")}</small></>}
          <div className="personal-module-row-actions"><button className="text-button" type="button" onClick={() => beginEdit(row)}>Изменить</button><button className="text-button personal-module-delete" type="button" onClick={() => void removeRow(String(row.id))}>Удалить</button></div>
        </li>)}</ul>}
      </div>
    </div>
  </section>;
}
