export const themes = [
  { id: "sage", name: "Sage & Banana", accent: "#d7d969", soft: "#e8eee0" },
  { id: "griotte", name: "Griotte & Ice", accent: "#b8324f", soft: "#e8f3f8" },
  { id: "seafoam", name: "Seafoam & Magenta", accent: "#ce4c8a", soft: "#daf1e9" },
] as const;

export type ThemeId = (typeof themes)[number]["id"];
export const themeStorageKey = "dayflow.theme";

export function isThemeId(value: string | null): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}
