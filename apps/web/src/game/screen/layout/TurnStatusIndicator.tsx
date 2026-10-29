import { useTranslation } from "@/i18n";
import "@/game/screen/layout/turnStatusIndicator.css";

type Props = { myTurn: boolean; actionRequired: boolean };

export function TurnStatusIndicator({ myTurn, actionRequired }: Props) {
  const { t } = useTranslation();
  return (
    <div
      className="game-turn-status"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-your-turn={myTurn || undefined}
      data-action-required={actionRequired || undefined}
    >
      <span>{t(myTurn ? "game.yourTurn" : "game.opponentsTurn")}</span>
      {actionRequired ? <strong>{t("game.actionRequired")}</strong> : null}
    </div>
  );
}
