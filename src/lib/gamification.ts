export type CompanionStage = "egg" | "hatchling" | "juvenile" | "adult";
export function levelForXp(xp: number) { return Math.max(1, Math.floor(Math.max(0, xp) / 100) + 1); }
export function stageForXp(xp: number): CompanionStage { if (xp >= 1000) return "adult"; if (xp >= 400) return "juvenile"; if (xp >= 100) return "hatchling"; return "egg"; }
export function xpToNextLevel(xp: number) { return 100 - (Math.max(0, xp) % 100); }
