// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nContext } from "@/i18n/I18nContext";
import { translator } from "@/i18n/translator";
import * as printedCardTranslationLoader from "@/i18n/loadPrintedCardTranslations";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import * as cardTranslationLoader from "@/i18n/loadCardTranslations";
import { cardTranslationCache } from "@/i18n/cardTranslationCache";
import type { Locale } from "@/i18n/locales";
import { EffectText } from "@/game/EffectText";
import { CardLink, CardOpenerProvider } from "@/game/cardLinks";
import { PermanentKeywordBadges } from "@/game/piece/PermanentKeywordBadges";
import { CardFull, CardMini } from "./cards";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CardMini orientation", () => {
  it("turns a suspended permanent sideways so the state is unambiguous", () => {
    render(<CardMini cardId="ST1-02" suspended zoomOnHover={false} />);

    const card = screen.getByTitle("Biyomon");
    expect(card.dataset.state).toBe("suspended");
    expect(card.style.rotate).toBe("90deg");
    expect(card.style.transformOrigin).toBe("center");
  });
});

// The arena uses pointer gestures even while play is gated between phases.
it.each([CardFull, CardMini])("#5394: artwork cannot start a browser-native image drag", (Card) => {
  render(<Card cardId="ST1-02" zoomOnHover={false} />);
  expect((screen.getByRole("img") as HTMLImageElement).draggable).toBe(false);
});

describe("CardMini board DP", () => {
  it("grows the DP number with the player's text size", () => {
    render(<CardMini cardId="ST1-02" width={92} dp={3000} info zoomOnHover={false} />);

    expect(screen.getByText("3K").style.fontSize).toBe("calc(10px * var(--ds-text-scale, 1))");
  });
});

it("loads Chinese card data on locale selection and restores the upstream locale on switching", async () => {
  cardTranslationCache.data = undefined;
  cardTranslationCache.pending = undefined;
  cardTranslationCache.printedData = undefined;
  cardTranslationCache.printedPending = undefined;
  function LocalizedCard({ locale }: { locale: Locale }) {
    return (
      <I18nContext.Provider value={{ locale, t: translator(locale), setLocale: () => undefined }}>
        <CardMini cardId="ST1-02" info zoomOnHover={false} />
        <CardLink cardId="ST1-02" />
        <EffectText text="End of Your Turn" />
        <PermanentKeywordBadges
          keywords={[{ keyword: "Reboot", label: "Reboot" }]}
          securityAttackModifier={0}
          cardWidth={100}
        />
      </I18nContext.Provider>
    );
  }
  const { rerender, container } = render(<LocalizedCard locale="en" />);
  expect(screen.getByTitle("Biyomon")).toBeTruthy();
  expect(cardTranslationCache.pending).toBeUndefined();
  rerender(<LocalizedCard locale="zh-CN" />);
  expect(await screen.findByTitle("比丘兽")).toBeTruthy();
  await waitFor(() => expect(container.querySelector(".card-effect-text")?.textContent).toBe("我方的回合结束时"));
  expect(container.querySelector(".game-keyword-badges")?.textContent).toBe("重启");
  expect(screen.getAllByText("比丘兽").length).toBeGreaterThan(0);
  rerender(<LocalizedCard locale="zh-TW" />);
  expect(screen.getByTitle("Biyomon")).toBeTruthy();
  expect(container.querySelector(".card-effect-text")?.textContent).toBe("End of Your Turn");
  expect(container.querySelector(".game-keyword-badges")?.textContent).toBe("Reboot");
});

it("loads card names without loading the printed-text dictionary", async () => {
  cardTranslationCache.data = undefined;
  cardTranslationCache.pending = undefined;
  cardTranslationCache.printedData = undefined;
  cardTranslationCache.printedPending = undefined;
  render(
    <I18nContext.Provider value={{ locale: "zh-CN", t: translator("zh-CN"), setLocale: () => undefined }}>
      <CardMini cardId="ST1-02" zoomOnHover={false} />
      <CardOpenerProvider onOpenCard={() => undefined}>
        <CardLink cardId="ST1-02" label="Biyomon" />
      </CardOpenerProvider>
    </I18nContext.Provider>,
  );
  expect(await screen.findByTitle("比丘兽")).toBeTruthy();
  expect(screen.getByText("Biyomon").tagName).toBe("BUTTON");
  expect(cardTranslationCache.printedPending).toBeUndefined();
});

it("keeps the signed modifier and rule link in a Chinese printed keyword hint", async () => {
  const { container } = render(
    <I18nContext.Provider value={{ locale: "zh-CN", t: translator("zh-CN"), setLocale: () => undefined }}>
      <EffectText text="＜安防攻击-2＞" />
    </I18nContext.Provider>,
  );
  const badge = await waitFor(() => {
    const node = container.querySelector("[data-badge-hint]");
    expect(node).toBeTruthy();
    return node!;
  });
  fireEvent.click(badge);
  expect(await screen.findByText("此数码宝贝进行安防判定的张数减少2张。")).toBeTruthy();
  expect(screen.getByRole("link").getAttribute("href")).toBe("https://world.digimoncard.com/rule/pdf/general_rule.pdf");
});

it("falls back after a failed dictionary load and retries on a later locale selection", async () => {
  cardTranslationCache.data = undefined;
  cardTranslationCache.pending = undefined;
  const load = vi
    .spyOn(cardTranslationLoader, "loadCardTranslations")
    .mockRejectedValueOnce(new Error("Network unavailable"));
  function LocalizedName({ locale }: { locale: Locale }) {
    return (
      <I18nContext.Provider value={{ locale, t: translator(locale), setLocale: () => undefined }}>
        <CardMini cardId="ST1-02" zoomOnHover={false} />
      </I18nContext.Provider>
    );
  }
  const { rerender } = render(<LocalizedName locale="zh-CN" />);
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  expect(screen.getByTitle("Biyomon")).toBeTruthy();
  rerender(<LocalizedName locale="en" />);
  rerender(<LocalizedName locale="zh-CN" />);
  expect(await screen.findByTitle("比丘兽")).toBeTruthy();
});

it("retains a Partition hint when ASCII display contains a nested Chinese condition", async () => {
  const { container } = render(
    <I18nContext.Provider value={{ locale: "zh-CN", t: translator("zh-CN"), setLocale: () => undefined }}>
      <EffectText text="＜分裂<蓝色Lv.4&绿色Lv.4>＞" asciiBrackets />
    </I18nContext.Provider>,
  );
  const badge = await waitFor(() => {
    const node = container.querySelector("[data-badge-hint]");
    expect(node?.textContent).toBe("<分裂<蓝色Lv.4&绿色Lv.4>>");
    return node!;
  });
  fireEvent.click(badge);
  expect(screen.getByRole("link").textContent).toContain("16-");
});

it("keeps translated names available when printed-text loading fails and recovers on reselection", async () => {
  cardTranslationCache.data = undefined;
  cardTranslationCache.pending = undefined;
  cardTranslationCache.printedData = undefined;
  cardTranslationCache.printedPending = undefined;
  const text = getCardDefinition("ST1-03")!.inheritedEffectText!;
  const load = vi
    .spyOn(printedCardTranslationLoader, "loadPrintedCardTranslations")
    .mockRejectedValueOnce(new Error("Printed-text request failed"));
  function LocalizedCard({ locale }: { locale: Locale }) {
    return (
      <I18nContext.Provider value={{ locale, t: translator(locale), setLocale: () => undefined }}>
        <CardMini cardId="ST1-02" zoomOnHover={false} />
        <EffectText text={text} />
      </I18nContext.Provider>
    );
  }
  const { container, rerender } = render(<LocalizedCard locale="zh-CN" />);
  expect(await screen.findByTitle("比丘兽")).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
  expect(container.querySelector(".card-effect-text")?.textContent).toBe(text);
  rerender(<LocalizedCard locale="en" />);
  rerender(<LocalizedCard locale="zh-CN" />);
  await waitFor(() =>
    expect(container.querySelector(".card-effect-text")?.textContent).toContain("此数码宝贝的DP+1000。"),
  );
  expect(screen.getByTitle("比丘兽")).toBeTruthy();
});
