import { useEffect, useId, useRef, useState } from "react";
import { Button, Dialog } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { useBoardPreview } from "@/game/overlay/choice/useBoardPreview";
import { DecisionViewBoardButton } from "@/game/overlay/choice/DecisionViewBoardButton";
import { ManualAction } from "@aegis/shared/manual/ManualAction";
import { ManualBreedingChoice } from "@aegis/shared/manual/ManualBreedingChoice";
import type { ManualCommand } from "@aegis/shared/manual/ManualCommand";
import type { GameState } from "@aegis/shared/schema/GameState";
import { Phase, type Seat } from "@aegis/shared/schema/enums";
import { GameMode } from "@aegis/shared/manual/GameMode";

type Props = {
  state: GameState;
  seat: Seat;
  send: (command: ManualCommand) => void;
  spectating?: boolean;
  presenting?: boolean;
  disabled?: boolean;
  onOpen?: () => void;
};

export function ManualBreedingPrompt({ state, seat, send, spectating, presenting, disabled, onOpen }: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  const { isViewingBoard, openBoard, boardReturn } = useBoardPreview();
  const table = state.manual;
  const eligible =
    state.gameMode === GameMode.MANUAL.value &&
    !state.gameOver &&
    !spectating &&
    state.turnSeat === seat &&
    table.turnPhase === Phase.Breeding &&
    table.undoRequester === -1 &&
    table.resultRequester === -1 &&
    table.restartRequester === -1 &&
    !presenting &&
    state.turnCount > 0 &&
    (table.canHatch || table.canMoveFromBreeding);
  const showing = eligible && !isViewingBoard;
  const wasShowing = useRef(false);
  const [prepared, setPrepared] = useState(!onOpen);
  useEffect(() => {
    if (showing && !wasShowing.current) {
      onOpen?.();
      setPrepared(true);
    } else if (!showing) {
      setPrepared(false);
    }
    wasShowing.current = showing;
  }, [showing, onOpen]);
  if (!eligible) {
    return null;
  }
  if (isViewingBoard) {
    return boardReturn;
  }
  if (!prepared) {
    return null;
  }
  const blocked = disabled;
  return (
    <Dialog
      className="game-confirm-dialog game-confirm-dialog--primary"
      labelledBy={titleId}
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <h2 id={titleId} className="game-confirm-dialog__title">
        {t("game.phaseBanner.breeding")}
      </h2>
      <p className="game-confirm-dialog__body">{t("manual.turn.breedingPrompt")}</p>
      <div className="game-confirm-dialog__actions">
        {table.canHatch ? (
          <Button
            disabled={blocked}
            onClick={() => send({ action: ManualAction.BREEDING.value, choice: ManualBreedingChoice.HATCH.value })}
          >
            {t("game.hatchEgg")}
          </Button>
        ) : null}
        {table.canMoveFromBreeding ? (
          <Button
            disabled={blocked}
            onClick={() => send({ action: ManualAction.BREEDING.value, choice: ManualBreedingChoice.MOVE.value })}
          >
            {t("game.moveToBattle")}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          disabled={blocked}
          onClick={() => send({ action: ManualAction.BREEDING.value, choice: ManualBreedingChoice.SKIP.value })}
        >
          {t("manual.turn.skipBreeding")}
        </Button>
      </div>
      <DecisionViewBoardButton onOpenBoard={openBoard} />
    </Dialog>
  );
}
