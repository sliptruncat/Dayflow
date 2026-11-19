"use client";

import { useEffect, useState } from "react";
import { themeStorageKey, themes, type ThemeId } from "@/lib/themes";
import { ThemePicker } from "@/components/theme-picker";

const hueStorageKey = "dayflow.background-hue";

function applyHue(hue: number) {
  document.documentElement.style.setProperty("--personal-hue", String(hue));
}

export function ThemeSettings({ initialTheme, isAuthenticated }: { initialTheme: ThemeId; isAuthenticated: boolean }) {
  const [theme, setTheme] = useState<ThemeId>(initialTheme);
  const [hue, setHue] = useState(92);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedHue = Number(window.localStorage.getItem(hueStorageKey));
    if (Number.isFinite(storedHue) && storedHue >= 0 && storedHue <= 360) {
      setHue(storedHue);
      applyHue(storedHue);
    }
  }, []);

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

  function changeHue(nextHue: number) {
    setHue(nextHue);
    applyHue(nextHue);
    window.localStorage.setItem(hueStorageKey, String(nextHue));
  }

  return (
    <section className="settings-card appearance-settings">
      <p className="eyebrow">ВНЕШНИЙ ВИД / 01</p>
      <h2>Настроить атмосферу</h2>
      <p>Три авторские палитры задают характер DAYFLOW. Выберите основу, а затем настройте оттенок фонового пространства.</p>
      <div className="appearance-section">
        <div className="appearance-section-heading"><span>Фирменные палитры</span><small>01 — 03</small></div>
        <div className="theme-options">
          {themes.map((item, index) => (
            <button key={item.id} type="button" className={theme === item.id ? "theme-option theme-option--active" : "theme-option"} onClick={() => changeTheme(item.id)}>
              <span className={`theme-option-art theme-option-art--${item.id}`} aria-hidden="true"><i /><i /><i /></span>
              <span className="theme-option-copy"><strong>{item.name}</strong><small>{item.id === "sage" ? "Шалфейный и банановый" : item.id === "griotte" ? "Гриот и ледяной голубой" : "Морская пена и маджента"}</small></span>
              <span className="theme-option-index">{String(index + 1).padStart(2, "0")}</span>
              {theme === item.id && <span className="theme-option-check" aria-label="Выбрано">✓</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="appearance-section hue-section">
        <div className="appearance-section-heading"><span>Оттенок пространства</span><small>COLOR STUDIO</small></div>
        <div className="hue-control">
          <div className="hue-wheel" style={{ "--hue": `${hue}deg` } as React.CSSProperties}>
            <span />
          </div>
          <div className="hue-control-main">
            <label htmlFor="background-hue">Цветовой спектр</label>
            <input id="background-hue" className="hue-slider" type="range" min="0" max="360" value={hue} onChange={(event) => changeHue(Number(event.target.value))} />
            <div className="hue-scale"><span>Тёплый</span><span>Холодный</span><span>Насыщенный</span></div>
            <p>Меняет только мягкий оттенок фона, сохраняя читаемость текста и контраст элементов.</p>
          </div>
        </div>
        <button type="button" className="text-button hue-reset" onClick={() => changeHue(92)}>Сбросить оттенок</button>
      </div>
      <p className="settings-save-message" role="status">{message || "Изменения фона сохраняются на этом устройстве."}</p>
    </section>
  );
}
