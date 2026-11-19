"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navigationItems, type AppSection } from "@/lib/navigation";
import { isThemeId, themeStorageKey, type ThemeId } from "@/lib/themes";
import { ThemePicker } from "@/components/theme-picker";
import type { AppContext } from "@/server/app-context";

type AppShellProps = { children: React.ReactNode; activeSection?: AppSection; context: AppContext };

export function AppShell({ children, context, activeSection }: AppShellProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<ThemeId>(context.preferences?.theme_id ?? "sage");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!context.user) {
      const stored = window.localStorage.getItem(themeStorageKey);
      if (isThemeId(stored)) setTheme(stored);
    }
  }, [context.user]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (!context.user) window.localStorage.setItem(themeStorageKey, theme);
  }, [context.user, theme]);

  async function changeTheme(nextTheme: ThemeId) {
    setTheme(nextTheme);
    if (!context.user) return;
    const response = await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme_id: nextTheme }),
    });
    if (!response.ok) console.error("Не удалось сохранить тему DAYFLOW.");
  }

  async function signOut() {
    const { getBrowserSupabaseClient } = await import("@/lib/supabase/browser");
    await getBrowserSupabaseClient()?.auth.signOut();
    window.location.assign("/auth/sign-in");
  }

  const current = navigationItems.find((item) => item.slug === activeSection)
    ?? navigationItems.find((item) => item.href === pathname)
    ?? navigationItems[0];

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <button className="icon-button" aria-label="Открыть навигацию" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>☰</button>
        <span className="wordmark">DAYFLOW</span>
        <ThemePicker value={theme} onChange={changeTheme} />
      </header>
      <aside className={`sidebar ${menuOpen ? "sidebar--open" : ""}`} aria-label="Основная навигация">
        <div className="brand"><span className="brand-mark">◒</span><span>DAYFLOW</span></div>
        <p className="sidebar-caption">Пространство для важного.</p>
        <nav>
          {navigationItems.map((item) => (
            <Link key={item.slug} href={item.href} className={(pathname === item.href || (item.slug === "projects" && pathname === "/goals")) ? "nav-link nav-link--active" : "nav-link"} onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          {context.user
            ? <div className="account-control"><span title={context.user.email ?? undefined}>{context.profile?.display_name || context.user.email}</span><button onClick={signOut}>Выйти</button></div>
            : context.configured ? <Link className="sign-in-link" href="/auth/sign-in">Войти</Link> : <span className="setup-label">Нужна настройка</span>}
          <ThemePicker value={theme} onChange={changeTheme} />
        </div>
      </aside>
      <main className="main-content">
        <div className="context-bar"><span>{current.label}</span><span className={`context-status ${context.databaseError ? "context-status--error" : ""}`}>{context.databaseError ? "Синхронизация недоступна" : "Личный режим"}</span></div>
        {children}
      </main>
      <nav className="bottom-nav" aria-label="Мобильная навигация">
        {navigationItems.slice(0, 5).map((item) => <Link key={item.slug} href={item.href} aria-current={(pathname === item.href || (item.slug === "projects" && pathname === "/goals")) ? "page" : undefined}>{item.label}</Link>)}
      </nav>
    </div>
  );
}
