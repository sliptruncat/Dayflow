import { AppShell } from "@/components/app-shell";
import { ThemeSettings } from "@/features/settings/theme-settings";
import { getAppContext } from "@/server/app-context";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await getAppContext();
  const initialTheme = context.preferences?.theme_id ?? "sage";
  return (
    <AppShell context={context} activeSection="settings">
      <section className="page-stack">
        <header className="page-heading">
          <p className="eyebrow">ВАШЕ ПРОСТРАНСТВО</p>
          <h1>Настройки</h1>
          <p>Настройте DAYFLOW под свой ритм и предпочтения.</p>
        </header>
        <ThemeSettings initialTheme={initialTheme} isAuthenticated={Boolean(context.user)} />
      </section>
    </AppShell>
  );
}
