"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

type Mode = "sign-in" | "sign-up" | "reset" | "update";
const copy: Record<Mode, { title: string; description: string; submit: string }> = {
  "sign-in": { title: "С возвращением", description: "Войдите, чтобы продолжить свой день.", submit: "Войти" },
  "sign-up": { title: "Начнём спокойно", description: "Создайте личное пространство DAYFLOW.", submit: "Создать аккаунт" },
  reset: { title: "Восстановить пароль", description: "Отправим ссылку для безопасного обновления пароля.", submit: "Отправить ссылку" },
  update: { title: "Новый пароль", description: "Выберите новый пароль для вашей учётной записи.", submit: "Сохранить пароль" },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter(); const search = useSearchParams();
  const [message, setMessage] = useState<string>(); const [error, setError] = useState<string>(); const [loading, setLoading] = useState(false);
  const hasEmail = mode !== "update"; const detail = copy[mode];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(undefined); setMessage(undefined); setLoading(true);
    const client = getBrowserSupabaseClient();
    if (!client) { setError("Supabase ещё не настроен. Добавьте переменные окружения и перезапустите приложение."); setLoading(false); return; }
    const form = new FormData(event.currentTarget); const email = String(form.get("email") ?? "").trim(); const password = String(form.get("password") ?? "");
    const origin = window.location.origin;
    try {
      if (mode === "sign-in") { const { error: authError } = await client.auth.signInWithPassword({ email, password }); if (authError) throw authError; router.replace(search.get("next") || "/"); router.refresh(); return; }
      if (mode === "sign-up") { const { data, error: authError } = await client.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback?next=/` } }); if (authError) throw authError; setMessage(data.session ? "Аккаунт создан. Вы уже вошли." : "Проверьте почту и подтвердите адрес, чтобы завершить вход."); return; }
      if (mode === "reset") { const { error: authError } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/auth/update-password` }); if (authError) throw authError; setMessage("Если адрес существует, ссылка для восстановления уже отправлена."); return; }
      const { error: authError } = await client.auth.updateUser({ password }); if (authError) throw authError; setMessage("Пароль обновлён. Теперь можно продолжить работу."); router.replace("/"); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось выполнить действие."); }
    finally { setLoading(false); }
  }
  return <section className="auth-card"><p className="eyebrow">DAYFLOW / АККАУНТ</p><h1>{detail.title}</h1><p>{detail.description}</p><form onSubmit={submit} className="auth-form" noValidate>{hasEmail && <label>Электронная почта<input required type="email" name="email" autoComplete="email" placeholder="you@example.com" /></label>}{mode !== "reset" && <label>Пароль<input required minLength={8} type="password" name="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} placeholder="Не менее 8 символов" /></label>}{error && <p className="form-message form-message--error" role="alert">{error}</p>}{message && <p className="form-message" role="status">{message}</p>}<button className="button" disabled={loading}>{loading ? "Подождите…" : detail.submit}</button></form><div className="auth-links">{mode === "sign-in" && <><Link href="/auth/reset-password">Забыли пароль?</Link><Link href="/auth/sign-up">Создать аккаунт</Link></>}{mode === "sign-up" && <Link href="/auth/sign-in">Уже есть аккаунт? Войти</Link>}{mode === "reset" && <Link href="/auth/sign-in">Вернуться ко входу</Link>}</div></section>;
}
