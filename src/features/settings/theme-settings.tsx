"use client";

import { useEffect, useState } from "react";
import { isThemeId, themeStorageKey, themes, type ThemeId } from "@/lib/themes";
import { ThemePicker } from "@/components/theme-picker";

export function ThemeSettings({ initialTheme, isAuthenticated }: { initialTheme: ThemeId; isAuthenticated: boolean }) {
  const [theme, setTheme] = useState<ThemeId>(initialTheme);
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (!isAuthenticated) window.localStorage.setItem(themeStorageKey, theme);
  }, [theme, isAuthenticated]);

  function changeTheme(nextTheme: ThemeId) {
    setTheme(nextTheme);
    setMessage("Сохраняем тему…");
    if (!isAuthenticated) {
      window.localStorage.setItem(themeStorageKey, nextTheme);
      setMessage("Тема сохранена на этом устройстве.");
      return;
    }
    void fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme_id: nextTheme }),
    }).then((response) => {
      if (!response.ok) throw new Error("Не удалось сохранить тему.");
      setMessage("Тема сохранена в вашем аккаунте.");
    }).catch(() => setMessage("Не удалось сохранить тему. Попробуйте ещё раз."));
  }

  return (
    <section className="settings-card">
      <p className="eyebrow">ВНЕШНИЙ ВИД</p>
      <h2>Цветовая тема</h2>
      <p>Выберите палитру, в которой вам комфортно планировать день. Изменение применяется сразу.</p>
      <ThemePicker value={theme} onChange={changeTheme} />
      <div className="theme-options">
        {themes.map((item) => (
          <button key={item.id} type="button" className={theme === item.id ? "theme-option theme-option--active" : "theme-option"} onClick={() => changeTheme(item.id)}>
            <span className="theme-option-swatches"><i style={{ background: item.soft }} /><i style={{ background: item.accent }} /></span>
            <span><strong>{item.name}</strong><small>{item.id === "sage" ? "Шалфейный и банановый" : item.id === "griotte" ? "Гриот и ледяной голубой" : "Морская пена и маджента"}</small></span>
            {theme === item.id && <span aria-label="Выбрано">✓</span>}
          </button>
        ))}
      </div>
      <p className="settings-save-message" role="status">{message}</p>
    </section>
  );
}
