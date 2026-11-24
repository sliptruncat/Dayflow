"use client";

import { themes, type ThemeId } from "@/lib/themes";

export function ThemePicker({ value, onChange }: { value: ThemeId; onChange: (theme: ThemeId) => void }) {
  return (
    <div className="theme-picker" aria-label="Цветовая тема">
      <span className="theme-picker-label">Тема</span>
      {themes.map((theme) => (
        <button
          key={theme.id}
          type="button"
          className={value === theme.id ? "theme-dot theme-dot--active" : "theme-dot"}
          style={{ backgroundColor: theme.accent }}
          onClick={() => onChange(theme.id)}
          aria-label={`Тема ${theme.name}`}
          aria-pressed={value === theme.id}
        />
      ))}
    </div>
  );
}
