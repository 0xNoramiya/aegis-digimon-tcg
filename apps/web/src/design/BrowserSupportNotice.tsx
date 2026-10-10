import { useTranslation } from "../i18n";

// The interface colours are built with color-mix(), which Safari before 16.2,
// Chrome before 111 and Firefox before 113 drop, leaving panels unreadable.
export function browserLacksColorMix(css: Pick<typeof CSS, "supports"> | undefined = globalThis.CSS): boolean {
  return typeof css?.supports === "function" && !css.supports("color", "color-mix(in srgb, red, blue)");
}

export function BrowserSupportNotice() {
  const { t } = useTranslation();
  if (!browserLacksColorMix()) return null;
  return (
    <p className="aegis-browser-notice" role="alert">
      {t("browser.outdated")}
    </p>
  );
}
