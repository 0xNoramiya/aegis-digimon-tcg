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

const literalChineseMistranslations =
  /甲板|火柴|沃尔沃|沃爾沃|主菜(?!单)|繁殖|育种|育種|养殖|養殖|数码兽|數碼獸|数字进化|數位進化|数字革命|數位革命|宙斯盾|神盾|套牌|牌组|牌組|抽奖|抽獎|节省|拦截者|攔截者/;
const pauseKeys = new Set(["rollback.waiting", "replay.pause", "lobby.timer.rules", "game.timer.paused"]);
const inGameKey = /^(game|overlay|log|notice|panel|showcase|reject|mobile\.overlay|mobile\.board|redesign\.arena)\./;

describe.each(["zh-CN", "zh-TW"] as const)("%s game terminology", (locale) => {
  it("avoids literal mistranslations of deck, match, Digivolve, breeding and Digimon", () => {
    const mistranslated = Object.entries(dictionaries[locale])
      .filter(([, value]) => literalChineseMistranslations.test(value))
      .map(([key, value]) => ({ key, value }));
    expect(mistranslated).toEqual([]);
  });

  it("uses pause wording only for pausing, not for suspending cards", () => {
    const misused = Object.entries(dictionaries[locale])
      .filter(([key, value]) => /暂停|暫停/.test(value) && !pauseKeys.has(key))
      .map(([key, value]) => ({ key, value }));
    expect(misused).toEqual([]);
  });

  it("uses the card-game term, not file deletion, for deleting Digimon", () => {
    const misused = Object.entries(dictionaries[locale])
      .filter(([key, value]) => inGameKey.test(key) && /删除|刪除/.test(value))
      .map(([key, value]) => ({ key, value }));
    expect(misused).toEqual([]);
  });
});

const literalFrenchMistranslations =
  /\b(?:[Pp]onts?|[Tt]errasses?|[Pp]latines?|[Tt]rappe|[Pp]oubelle|[Rr]eproduction|[Cc]orrespondance|[Dd]ompteurs?|[Rr]ediffusions?|[Pp]ieux?|[Rr]ebondir|[Tt]irages)\b|Digi-(?:Egg|[Oo]euf)/;
const informalFrenchAddress = /(?<!\p{L})(?:[Tt]u|[Tt]on|[Tt]a|[Tt]es|[Tt]oi)(?!\p{L})/u;
const googleDriveTrashKeys = new Set([
  "replay.trashOffer",
  "replay.trashConfirm",
  "replay.trashDone",
  "replay.trashFailed",
]);

describe("fr game terminology", () => {
  it("avoids literal mistranslations of deck, hatch, breeding, trash, match and Tamer", () => {
    const mistranslated = Object.entries(dictionaries.fr)
      .filter(([, value]) => literalFrenchMistranslations.test(value))
      .map(([key, value]) => ({ key, value }));
    expect(mistranslated).toEqual([]);
  });

  it("uses défausse for the card-game trash and keeps corbeille for Google Drive", () => {
    const misused = Object.entries(dictionaries.fr)
      .filter(([key, value]) => /[Cc]orbeille/.test(value) && !googleDriveTrashKeys.has(key))
      .map(([key, value]) => ({ key, value }));
    expect(misused).toEqual([]);
  });

  it("addresses the player with vous", () => {
    const informal = Object.entries(dictionaries.fr)
      .filter(([, value]) => informalFrenchAddress.test(value))
      .map(([key, value]) => ({ key, value }));
    expect(informal).toEqual([]);
  });
});

const literalGermanMistranslations =
  /Streichh|Übereinstimmung|Luke|Müll|Brut(?:gebiet|bereich|phase)|\bZucht|Bändiger|Zähmer|Ärmel|Wiederholung|[Dd]igitalisier|Eierdeck|Sicherheit|\bSpeicher\b|Wirbelangriff|\[(?:Zähler|Gegen|Haupt)\]/;
const informalGermanAddress = /(?<!\p{L})(?:[Dd]u|[Dd]ein(?:e|en|em|er|es)?|[Dd]ich|[Dd]ir)(?!\p{L})/u;
const tamerCommandKey = /^chat\.emote\./;

describe("de game terminology", () => {
  it("avoids literal mistranslations of match, hatch, breeding, trash, security, memory and replay", () => {
    const mistranslated = Object.entries(dictionaries.de)
      .filter(([, value]) => literalGermanMistranslations.test(value))
      .map(([key, value]) => ({ key, value }));
    expect(mistranslated).toEqual([]);
  });

  it("uses Ablage for the card-game trash and keeps Papierkorb for Google Drive", () => {
    const misused = Object.entries(dictionaries.de)
      .filter(([key, value]) => /Papierkorb/.test(value) && !googleDriveTrashKeys.has(key))
      .map(([key, value]) => ({ key, value }));
    expect(misused).toEqual([]);
  });

  it("addresses the player with Sie outside Tamer commands", () => {
    const informal = Object.entries(dictionaries.de)
      .filter(([key, value]) => !tamerCommandKey.test(key) && informalGermanAddress.test(value))
      .map(([key, value]) => ({ key, value }));
    expect(informal).toEqual([]);
  });
});
