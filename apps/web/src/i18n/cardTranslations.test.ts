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

it("reuses complete translated lines on new cards while preserving unfamiliar rules", () => {
  const sample = { ...translations, text: { "[OnPlay]Draw1.": "【登场时】抽1张卡。" } };
  expect(getTranslatedCardText({ text: "[On Play] Draw 1.\n[Future Timing] New rule.", translations: sample })).toBe(
    "[登场时]抽1张卡。\n[Future Timing] New rule.",
  );
  expect(getTranslatedCardText({ text: "[On Play] Draw 1. Then delete 1 Digimon.", translations: sample })).toBe(
    "[On Play] Draw 1. Then delete 1 Digimon.",
  );
});

it("translates both printed faces of the dual card and non-Digimon types", () => {
  const card = allCards().find((candidate) => candidate.cardId === "LM-067")!;
  expect(getTranslatedCardText({ text: card.effectText!, translations })).toContain("每丢弃1张");
  expect(getTranslatedCardText({ text: card.optionEffect!, translations })).toContain("退化3");
  expect(getTranslatedCardMeta({ value: "Option", group: "forms", translations })).toBe("选项");
});

it("keeps every current catalog effect covered when new cards are imported", () => {
  const missing: string[] = [];
  for (const card of allCards()) {
    for (const field of [
      "effectText",
      "inheritedEffectText",
      "securityEffectText",
      "optionEffect",
      "linkEffect",
    ] as const) {
      const text = card[field];
      if (text && getTranslatedCardText({ text, translations }) === text) {
        missing.push(`${card.cardId}:${field}`);
      }
    }
  }
  expect(missing).toEqual([]);
});

it("uses the maintained Chinese names for Arts Digivolve and Assembly", () => {
  expect(getTranslatedKeyword({ keyword: "＜Arts Digivolve＞", translations })).toBe("＜技艺进化＞");
  expect(getTranslatedKeyword({ keyword: "＜Assembly -5＞", translations })).toBe("＜组装-5＞");
  expect(getTranslatedKeyword({ keyword: "＜Assembly -6＞", translations })).toBe("＜组装-6＞");
  const artsCard = allCards().find((card) => card.cardId === "BT27-035")!;
  const assemblyCard = allCards().find((card) => card.cardId === "EX14-054")!;
  expect(getTranslatedCardText({ text: artsCard.optionEffect!, translations })).toContain("技艺进化");
  expect(getTranslatedCardText({ text: assemblyCard.effectText!, translations })).toContain("组装-5");
  expect(Object.values(translations.text).some((text) => /Arts Digivolve|Assembly|拼装/.test(text))).toBe(false);
});

it.each([2, 4, 5, 6, 7, 8, 9])("preserves Assembly's -%i cost reduction and English fallback", (reduction) => {
  const keyword = `＜Assembly -${reduction}＞`;
  expect(getTranslatedKeyword({ keyword, translations })).toBe(`＜组装-${reduction}＞`);
  expect(resolveTranslatedKeyword({ keyword, translations }).reminderKeyword).toBe(`Assembly -${reduction}`);
  expect(getTranslatedKeyword({ keyword })).toBe(keyword);
});

it("preserves Assembly material conditions", () => {
  expect(
    getTranslatedKeyword({ keyword: "<Assembly -5 (3 [Greed] trait cards w/different levels)>", translations }),
  ).toBe("<组装-5 (3 [Greed] trait cards w/different levels)>");
});

it.each(["\n", "\r\n", "\r"])("preserves %j line breaks and unfamiliar rules when reusing lines", (newline) => {
  const sample = { ...translations, text: { "[OnPlay]Draw1.": "【登场时】抽1张卡。" } };
  const text = `  [On Play] Draw 1.${newline}${newline}  [Future Timing] New rule.  `;
  expect(getTranslatedCardText({ text, translations: sample })).toBe(
    `[登场时]抽1张卡。${newline}${newline}  [Future Timing] New rule.  `,
  );
  expect(getTranslatedCardText({ text })).toBe(text);
});

it("prefers a full-field translation over line translations", () => {
  const sample = {
    ...translations,
    text: { "[OnPlay]Draw1.": "单行译文", "[OnPlay]Draw1.<Blocker>": "【登场时】整段译文" },
  };
  expect(getTranslatedCardText({ text: "[On Play] Draw 1.\n<Blocker>", translations: sample })).toBe(
    "[登场时]整段译文",
  );
});
