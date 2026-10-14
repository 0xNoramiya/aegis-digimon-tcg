import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { loadDictionary } from "@/i18n/loadDictionary";
import { LOCALES, type Locale } from "@/i18n/locales";
import type { Dictionary } from "@/i18n/translationTypes";

const translatedLocales = LOCALES.filter((locale): locale is Exclude<Locale, "en"> => locale !== "en");
const dictionaries = Object.fromEntries(
  await Promise.all(translatedLocales.map(async (locale) => [locale, await loadDictionary(locale)] as const)),
) as Record<Exclude<Locale, "en">, Dictionary>;

function placeholders(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\w+\}/g)].map(([placeholder]) => placeholder))].sort();
}

describe.each(translatedLocales)("%s dictionary", (locale) => {
  const dictionary: Record<string, string> = dictionaries[locale];

  it("has exactly the English keys", () => {
    expect(Object.keys(dictionary).sort()).toEqual(Object.keys(en).sort());
  });

  it("has a non-empty string for every key", () => {
    const empty = Object.entries(dictionary)
      .filter(([, value]) => typeof value !== "string" || value.trim() === "")
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it("preserves whitespace used to join translated fragments", () => {
    const mismatches = Object.entries(en)
      .filter(
        ([key, value]) =>
          value.match(/^\s*/)?.[0] !== dictionary[key]?.match(/^\s*/)?.[0] ||
          value.match(/\s*$/)?.[0] !== dictionary[key]?.match(/\s*$/)?.[0],
      )
      .map(([key]) => key);
    expect(mismatches).toEqual([]);
  });

  it("uses the same placeholders as English", () => {
    const mismatches = Object.entries(en)
      .filter(([key, value]) => placeholders(dictionary[key] ?? "").join() !== placeholders(value).join())
      .map(([key, value]) => ({ key, en: placeholders(value), [locale]: placeholders(dictionary[key] ?? "") }));
    expect(mismatches).toEqual([]);
  });
});

const literalChineseMistranslations = /甲板|火柴|沃尔沃|沃爾沃|主菜(?!单)/;

describe.each(["zh-CN", "zh-TW"] as const)("%s game terminology", (locale) => {
  it("avoids literal mistranslations of deck, match, Digivolve and main deck", () => {
    const mistranslated = Object.entries(dictionaries[locale])
      .filter(([, value]) => literalChineseMistranslations.test(value))
      .map(([key, value]) => ({ key, value }));
    expect(mistranslated).toEqual([]);
  });
});
