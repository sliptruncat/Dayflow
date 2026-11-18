const SAFE_PATH_PATTERN = /^\/(?!\/)[^\\\\]*$/;

export function getSafeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://dayflow.invalid");
    if (parsed.origin !== "https://dayflow.invalid" || parsed.pathname.startsWith("//")) return fallback;
    if (value.startsWith("/\\\\") || /%2f|%5c/i.test(value)) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
