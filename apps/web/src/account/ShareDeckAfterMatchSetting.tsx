import { AccountPreferenceSwitch } from "@/account/AccountPreferenceSwitch";
import { useTranslation } from "@/i18n/useTranslation";

export function ShareDeckAfterMatchSetting() {
  const { t } = useTranslation();
  return (
    <AccountPreferenceSwitch
      preference="shareDeckAfterMatch"
      defaultValue
      label={t("settings.shareDeckAfterMatch")}
      description={t("settings.shareDeckAfterMatchDesc")}
      failedMessage={t("settings.shareDeckAfterMatchFailed")}
    />
  );
}
