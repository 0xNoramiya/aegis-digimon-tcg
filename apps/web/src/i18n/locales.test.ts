import { afterEach, describe, expect, it, vi } from "vitest";
import { isLocale } from "@/i18n/isLocale";
import { matchLocale } from "@/i18n/matchLocale";
import { loadLocale } from "@/i18n/loadLocale";
import { saveLocale } from "@/i18n/saveLocale";
import { LOCALES, LOCALE_STORAGE_KEY } from "@/i18n/locales";

describe("matchLocale", () => {
  it.each([
    ["it", "it"],
    ["it-IT", "it"],
    ["it-CH", "it"],
    ["en", "en"],
    ["en-US", "en"],
    ["pt", "pt-BR"],
    ["pt-br", "pt-BR"],
    ["pt-PT", "pt-BR"],
    ["es", "es"],
    ["es-419", "es"],
    ["es-MX", "es"],
    ["es-ES", "es"],
    ["ES-AR", "es"],
    ["ko-KR", "ko"],
    ["ja-JP", "ja"],
    ["zh", "zh-CN"],
    ["zh-CN", "zh-CN"],
    ["zh-SG", "zh-CN"],
    ["zh-Hans", "zh-CN"],
    ["zh-Hans-TW", "zh-CN"],
    ["zh-TW", "zh-TW"],
    ["zh-HK", "zh-TW"],
    ["zh-MO", "zh-TW"],
    ["zh-Hant", "zh-TW"],
    ["zh-Hant-CN", "zh-TW"],
    ["ZH_hant_HK", "zh-TW"],
    ["fr-CA", "fr"],
    ["de-AT", "de"],
    ["id-ID", "id"],
  ])("maps %s to %s", (tag, locale) => {
    expect(matchLocale(tag)).toBe(locale);
  });

  it("returns nothing for an unsupported language", () => {
    expect(matchLocale("xx-XX")).toBeUndefined();
  });
});

describe("isLocale", () => {
  it("accepts only exact supported locales", () => {
    expect(isLocale("it")).toBe(true);
    expect(isLocale("es")).toBe(true);
    expect(isLocale("pt-BR")).toBe(true);
    expect(isLocale("es-MX")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe("locale preferences", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(LOCALES)("recognizes %s as a saved choice", (locale) => {
    expect(isLocale(locale)).toBe(true);
  });

  it("rejects invalid stored values", () => {
    for (const value of [undefined, null, 3, {}, "constructor", "zh-Hant", "ko-KR"]) {
      expect(isLocale(value)).toBe(false);
    }
  });

  it("prefers a saved choice to browser languages", () => {
    vi.stubGlobal("localStorage", { getItem: () => "ko" });
    vi.stubGlobal("navigator", { languages: ["ja-JP"] });
    expect(loadLocale()).toBe("ko");
  });

  it("skips unsupported browser preferences", () => {
    vi.stubGlobal("localStorage", { getItem: () => "invalid" });
    vi.stubGlobal("navigator", { languages: ["xx", "zh-Hant-HK", "ko-KR"] });
    expect(loadLocale()).toBe("zh-TW");
  });

  it("detects the browser language when storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("unavailable");
      },
    });
    vi.stubGlobal("navigator", { language: "ko-KR" });
    expect(loadLocale()).toBe("ko");
  });

  it("defaults to English without browser or storage", () => {
    vi.stubGlobal("localStorage", undefined);
    vi.stubGlobal("navigator", undefined);
    expect(loadLocale()).toBe("en");
  });

  it("persists the selected Chinese variant", () => {
    const setItem = vi.fn<(key: string, value: string) => void>();
    vi.stubGlobal("localStorage", { setItem });
    saveLocale("zh-TW");
    expect(setItem).toHaveBeenCalledWith(LOCALE_STORAGE_KEY, "zh-TW");
  });

  it("allows choosing a language when storage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() => saveLocale("ko")).not.toThrow();
  });
});
