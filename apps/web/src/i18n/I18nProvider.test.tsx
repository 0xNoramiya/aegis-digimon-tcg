import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { useTranslation } from "@/i18n/useTranslation";

function LanguageProbe() {
  const { t } = useTranslation();
  return <button>{t("common.cancel")}</button>;
}

describe("interface language", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["ko", "취소"],
    ["ja", "キャンセル"],
    ["zh-CN", "取消"],
    ["zh-TW", "取消"],
    ["fr", "Annuler"],
    ["de", "Abbrechen"],
    ["id", "Batalkan"],
  ])("renders the saved %s translation", (locale, label) => {
    vi.stubGlobal("localStorage", { getItem: () => locale });
    const markup = renderToStaticMarkup(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    );
    expect(markup).toBe(`<button>${label}</button>`);
  });
});
