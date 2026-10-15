import { describe, expect, it } from "vitest";
import { allCards } from "@aegis/shared/cards/registry";
import { loadPrintedCardTranslations } from "@/i18n/loadPrintedCardTranslations";
import { resolveTranslatedKeyword } from "@/i18n/resolveTranslatedKeyword";
import { loadCardTranslations } from "@/i18n/loadCardTranslations";
import { getTranslatedCardName } from "@/i18n/getTranslatedCardName";
import { getTranslatedCardText } from "@/i18n/getTranslatedCardText";
import { getTranslatedKeyword } from "@/i18n/getTranslatedKeyword";
import { getTranslatedKeywordReminder } from "@/i18n/getTranslatedKeywordReminder";
import { getTranslatedCardMeta } from "@/i18n/getTranslatedCardMeta";
import { normalizePrintedTextKey } from "@/i18n/normalizePrintedTextKey";

const translations = await loadPrintedCardTranslations();

describe("Chinese card translation data against the upstream catalog", () => {
  it("shares a single dictionary load across consumers", async () => {
    const first = loadCardTranslations();
    const second = loadCardTranslations();
    expect(first).toBe(second);
    expect((await first).text).toEqual({});
    expect(loadPrintedCardTranslations()).toBe(loadPrintedCardTranslations());
    expect(await loadPrintedCardTranslations()).toBe(translations);
  });

  it("translates names without replacing upstream card identity", () => {
    const card = allCards().find((candidate) => candidate.nameEn === "Greymon")!;
    const before = JSON.stringify(card);
    expect(getTranslatedCardName({ name: card.nameEn, translations })).toBe("暴龙兽");
    expect(JSON.stringify(card)).toBe(before);
    expect(card.nameEn).toBe("Greymon");
  });

  it("matches full-width keyword brackets, entities and formatting whitespace", () => {
    const text = "[On Play] &lt;Blocker&gt;";
    const sample = { ...translations, text: { "[OnPlay]<Blocker>": "【登场时】《阻挡者》" } };
    expect(getTranslatedCardText({ text, translations: sample })).toBe("[登场时]＜阻挡者＞");
    expect(normalizePrintedTextKey("[On Play]\n＜Blocker＞")).toBe("[OnPlay]<Blocker>");
  });

  it("covers current upstream printed effects while keeping unknown effects readable", () => {
    const matched: string[] = [];
    for (const card of allCards()) {
      for (const text of [
        card.effectText,
        card.inheritedEffectText,
        card.securityEffectText,
        card.optionEffect,
        card.linkEffect,
      ]) {
        if (!text) {
          continue;
        }
        const translated = getTranslatedCardText({ text, translations });
        if (translated !== text) {
          matched.push(translated);
        }
      }
    }
    expect(matched.length).toBeGreaterThan(4000);
    expect(matched.every((text) => /[\u3400-\u9fff]/u.test(text))).toBe(true);
    expect(getTranslatedCardText({ text: "Future card effect", translations })).toBe("Future card effect");
  });

  it("preserves keyword parameters and uses translated reminders", () => {
    expect(getTranslatedKeyword({ keyword: "Reboot", translations })).toBe("重启");
    expect(getTranslatedKeyword({ keyword: "＜Security Attack +2＞", translations })).toBe("＜安防攻击+2＞");
    expect(getTranslatedKeywordReminder({ keyword: "Blocker", fallback: "English", translations })).toBe(
      translations.reminders.Blocker!.text,
    );
    expect(
      getTranslatedKeywordReminder({ keyword: "SecurityAttack", modifier: -2, fallback: "English", translations }),
    ).toContain("减少2张");
    expect(getTranslatedKeywordReminder({ keyword: "Future keyword", fallback: "English", translations })).toBe(
      "English",
    );
  });

  it("keeps English when the caller has no Chinese dictionary", () => {
    expect(getTranslatedCardName({ name: "Greymon" })).toBe("Greymon");
    expect(getTranslatedCardText({ text: "[On Play] Draw 1." })).toBe("[On Play] Draw 1.");
    expect(getTranslatedKeyword({ keyword: "Blocker" })).toBe("Blocker");
    expect(getTranslatedKeywordReminder({ keyword: "Blocker", fallback: "English" })).toBe("English");
    expect(getTranslatedCardMeta({ value: "Champion", group: "forms" })).toBe("Champion");
  });

  it("does not resolve object prototype keys as translations", () => {
    expect(getTranslatedCardName({ name: "constructor", translations })).toBe("constructor");
    expect(getTranslatedCardText({ text: "toString", translations })).toBe("toString");
    expect(getTranslatedKeyword({ keyword: "constructor", translations })).toBe("constructor");
    expect(getTranslatedCardMeta({ value: "__proto__", group: "traits", translations })).toBe("__proto__");
  });
});

it("keeps complete keyword conditions and does not substitute incomplete dictionary fragments", () => {
  expect(getTranslatedKeyword({ keyword: "Decode (Blue Lv.4)", translations })).toBe("解码(Blue Lv.4)");
  expect(getTranslatedKeyword({ keyword: "Decoy ([Xros Heart] trait)", translations })).toBe(
    "诱饵([Xros Heart] trait)",
  );
  expect(getTranslatedKeyword({ keyword: "Partition (blue Lv.4 & green Lv.4)", translations })).toBe(
    "分裂(blue Lv.4 & green Lv.4)",
  );
  expect(getTranslatedKeyword({ keyword: "<Draw 2>", translations })).toBe("<抽2张卡>");
});

it("retains signed modifiers when resolving a translated printed keyword back to its rule", () => {
  const resolved = resolveTranslatedKeyword({ keyword: "＜安防攻击-2＞", translations });
  expect(resolved.base).toBe("SecurityAttack");
  expect(getTranslatedKeywordReminder({ keyword: resolved.reminderKeyword, fallback: "English", translations })).toBe(
    "此数码宝贝进行安防判定的张数减少2张。",
  );
});

it("keeps form, attribute and trait translations in their own namespaces", () => {
  expect(getTranslatedCardMeta({ value: "Entertainment", group: "attributes", translations })).toBe("娱乐");
  expect(getTranslatedCardMeta({ value: "Entertainment", group: "traits", translations })).toBe("文艺娱乐");
});

it("keeps each maintained dictionary entry nonempty and text keys canonical", () => {
  const values = [
    ...Object.values(translations.names),
    ...Object.values(translations.text),
    ...Object.values(translations.keywords),
    ...Object.values(translations.meta).flatMap(Object.values),
    ...Object.values(translations.reminders).flatMap((entry) => [entry.zhName, entry.text]),
  ];
  expect(
    values.every((value) => typeof value === "string" && value.trim().length > 0 && !value.includes("\ufffd")),
  ).toBe(true);
  expect(Object.keys(translations.text).filter((key) => normalizePrintedTextKey(key) !== key)).toEqual([]);
});

it("resolves numbered Chinese draw labels to the upstream Draw rule", () => {
  const resolved = resolveTranslatedKeyword({ keyword: "＜抽2张卡＞", translations });
  expect(resolved.base).toBe("Draw");
  expect(resolved.label).toBe("＜抽2张卡＞");
});
