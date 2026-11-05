import { AccountPreferenceSwitch } from "@/account/AccountPreferenceSwitch";
import { useTranslation } from "@/i18n/useTranslation";

export function HideRankedDecksSetting() {
  const { t } = useTranslation();
  return (
    <AccountPreferenceSwitch
      preference="hideRankedDecks"
      defaultValue={false}
      label={t("ranked.settings.hideDecks")}
      description={t("ranked.settings.hideDecksDesc")}
      failedMessage={t("ranked.settings.hideDecksFailed")}
    />
  );
}
