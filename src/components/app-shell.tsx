"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navigationItems, type AppSection } from "@/lib/navigation";
import { isThemeId, themeStorageKey, themes, type ThemeId } from "@/lib/themes";

type AppShellProps = { children: React.ReactNode; activeSection?: AppSection };

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<ThemeId>("sage");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(themeStorageKey);
    if (isThemeId(stored)) setTheme(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  const current = navigationItems.find((item) => item.href === pathname) ?? navigationItems[0];

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <button className="icon-button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>☰</button>
        <span className="wordmark">DAYFLOW</span>
        <ThemePicker value={theme} onChange={setTheme} />
      </header>
      <aside className={`sidebar ${menuOpen ? "sidebar--open" : ""}`} aria-label="Primary navigation">
        <div className="brand"><span className="brand-mark">◒</span><span>DAYFLOW</span></div>
        <p className="sidebar-caption">Make room for what matters.</p>
        <nav>
          {navigationItems.map((item) => (
            <Link key={item.slug} href={item.href} className={pathname === item.href ? "nav-link nav-link--active" : "nav-link"} onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer"><ThemePicker value={theme} onChange={setTheme} /></div>
      </aside>
      <main className="main-content">
        <div className="context-bar"><span>{current.label}</span><span className="context-status">Foundation</span></div>
        {children}
      </main>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navigationItems.slice(0, 5).map((item) => <Link key={item.slug} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}
      </nav>
    </div>
  );
}

function ThemePicker({ value, onChange }: { value: ThemeId; onChange: (theme: ThemeId) => void }) {
  return <div className="theme-picker" aria-label="Color theme">{themes.map((theme) => <button key={theme.id} className={value === theme.id ? "theme-dot theme-dot--active" : "theme-dot"} style={{ backgroundColor: theme.accent }} onClick={() => onChange(theme.id)} aria-label={`Use ${theme.name}`} aria-pressed={value === theme.id} />)}</div>;
}
