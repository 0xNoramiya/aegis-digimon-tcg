import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readBotSettings } from "@/bot/readBotSettings";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("saved bot settings", () => {
  it.each([
    "{",
    "null",
    "[]",
    '{"botDifficulty":"constructor","botStyle":"defensive"}',
    '{"botDifficulty":"beginner","botStyle":"unknown"}',
  ])("uses defaults for malformed stored preferences %s", (stored) => {
    localStorage.setItem("aegis.botSettings", stored);
    expect(readBotSettings()).toEqual({ botDifficulty: "standard", botStyle: "balanced" });
  });

  it("uses defaults when storage is unavailable", () => {
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    expect(readBotSettings()).toEqual({ botDifficulty: "standard", botStyle: "balanced" });
  });

  it("restores validated selections", () => {
    localStorage.setItem("aegis.botSettings", JSON.stringify({ botDifficulty: "beginner", botStyle: "defensive" }));
    expect(readBotSettings()).toEqual({ botDifficulty: "beginner", botStyle: "defensive" });
  });
});
