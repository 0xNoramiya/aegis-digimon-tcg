import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GameState } from "@aegis/shared/schema/GameState";
import { RollbackControls } from "@/game/RollbackControls";
import type { AegisRoom } from "@/net/client";

vi.mock("@/i18n/useTranslation", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe("rollback controls ownership", () => {
  it.each([0, 1])("enables rollback only for the action owner in seat %s", (owner) => {
    const state = new GameState();
    state.allowRollback = true;
    state.turnCount = 1;
    state.canUndoAction = true;
    state.canRollbackTurn = true;
    state.undoActionSeat = owner;
    state.rollbackTurnSeat = owner;
    const room = {} as AegisRoom;
    const own = renderToStaticMarkup(<RollbackControls state={state} room={room} seat={owner} />);
    const opponent = renderToStaticMarkup(<RollbackControls state={state} room={room} seat={1 - owner} />);
    expect(own).not.toContain('disabled=""');
    expect(opponent).toContain('disabled=""');
  });
});
