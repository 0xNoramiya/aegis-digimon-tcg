import { getCardDefinition } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { ActionConfirmationOverlay } from "./ActionConfirmationOverlay";

const USE_REQUIREMENT_LINE = /^[＜<]Use Req\.[^＞>]*[＞>]$/;

const IMMEDIATE_OPTION_PASSAGES: Partial<Record<string, string>> = {
  "BT25-057": "[Main] 1 of your Digimon gains ＜Rush＞ , ＜Security A. +1＞ and +5000 DP for the turn.",
};

function withoutUseRequirement(optionEffect: string): string {
  return optionEffect
    .split("\n")
    .filter((line) => !USE_REQUIREMENT_LINE.test(line.trim()))
    .join("\n")
    .trim();
}

export function DualPlayChoiceOverlay({
  cardId,
  onChoose,
  onCancel,
}: {
  cardId: string;
  onChoose: (useAs: "digimon" | "option") => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const optionEffect = getCardDefinition(cardId)?.optionEffect;
  return (
    <ActionConfirmationOverlay
      cardId={cardId}
      title={t("overlay.useAsOption")}
      detail={optionEffect ? withoutUseRequirement(optionEffect) : t("overlay.dualPlayDetail")}
      emphasis={IMMEDIATE_OPTION_PASSAGES[cardId]}
      confirmLabel={t("overlay.useAsOption")}
      onConfirm={() => onChoose("option")}
      onCancel={onCancel}
    />
  );
}
