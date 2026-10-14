import type { GameState } from "@aegis/shared/schema/GameState";
import type { Seat } from "@aegis/shared/schema/enums";
import type { TranslationKey } from "@/i18n/translationTypes";

type ActingSeatParams = {
  state: GameState;
  displayedTurnSeat: Seat;
};

type ChipKeyParams = {
  viewerActs: boolean;
  spectating: boolean;
};

type Params = ActingSeatParams & {
  viewerSeat: Seat;
  spectating: boolean;
};

export type ActingPlateKeys = {
  viewer?: TranslationKey;
  opponent?: TranslationKey;
};

function findActingSeat({ state, displayedTurnSeat }: ActingSeatParams): Seat | null {
  if (state.gameOver) {
    return null;
  }
  if (state.pendingDecision) {
    return state.pendingDecision.seat;
  }
  if (state.combatWindow) {
    return state.combatWindow.seat;
  }
  return displayedTurnSeat;
}

function getChipKey({ viewerActs, spectating }: ChipKeyParams): TranslationKey {
  if (spectating) {
    return "game.acting.player";
  }
  return viewerActs ? "game.acting.you" : "game.acting.opponent";
}

export function getActingPlateKeys({ state, displayedTurnSeat, viewerSeat, spectating }: Params): ActingPlateKeys {
  const actingSeat = findActingSeat({ state, displayedTurnSeat });
  if (actingSeat === null) {
    return {};
  }
  const viewerActs = actingSeat === viewerSeat;
  const key = getChipKey({ viewerActs, spectating });
  return viewerActs ? { viewer: key } : { opponent: key };
}
