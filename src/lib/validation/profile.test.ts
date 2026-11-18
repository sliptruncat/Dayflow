import { describe, expect, it } from "vitest";
import { profileUpdateSchema } from "./profile";
describe("profile validation", () => { it("accepts a bounded profile", () => expect(profileUpdateSchema.parse({ display_name: "Аня", timezone: "Europe/Moscow", locale: "ru" }).display_name).toBe("Аня")); it("rejects unsafe avatar URL", () => expect(profileUpdateSchema.safeParse({ avatar_url: "file:///private" }).success).toBe(false)); });
