import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { dictionaries } from "@/i18n/dictionaries";
import { LOCALES, type Locale } from "@/i18n/locales";

const translatedLocales = LOCALES.filter((locale): locale is Exclude<Locale, "en"> => locale !== "en");

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
