import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ManualBreedingPrompt } from "@/game/manual/ManualBreedingPrompt";
import { ManualCombatControls } from "@/game/manual/ManualCombatControls";
import { GameState } from "@aegis/shared/schema/GameState";
import { GameMode } from "@aegis/shared/manual/GameMode";
import { Phase } from "@aegis/shared/schema/enums";
import type { ManualCommand } from "@aegis/shared/manual/ManualCommand";

vi.mock("@/i18n/useTranslation", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function createBreedingState() {
  const state = new GameState();
  state.gameMode = GameMode.MANUAL.value;
  state.turnCount = 1;
  state.manual.turnPhase = Phase.Breeding;
  state.manual.canHatch = true;
  return state;
}

describe("guided manual breeding", () => {
  it("offers only the server-projected hatch choice and skipping in the native dialog", () => {
    const state = createBreedingState();
    const markup = renderToStaticMarkup(
      <ManualBreedingPrompt state={state} seat={0} send={vi.fn<(command: ManualCommand) => void>()} />,
    );
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain("game.hatchEgg");
    expect(markup).toContain("manual.turn.skipBreeding");
    expect(markup).not.toContain("game.moveToBattle");
  });

  it("offers movement only when the server projects that choice", () => {
    const state = createBreedingState();
    state.manual.canHatch = false;
    state.manual.canMoveFromBreeding = true;
    const markup = renderToStaticMarkup(
      <ManualBreedingPrompt state={state} seat={0} send={vi.fn<(command: ManualCommand) => void>()} />,
    );
    expect(markup).toContain("game.moveToBattle");
    expect(markup).not.toContain("game.hatchEgg");
  });

  it("keeps the opponent and spectators out of the active player's choice", () => {
    const state = createBreedingState();
    expect(
      renderToStaticMarkup(
        <ManualBreedingPrompt state={state} seat={1} send={vi.fn<(command: ManualCommand) => void>()} />,
      ),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        <ManualBreedingPrompt state={state} seat={0} spectating send={vi.fn<(command: ManualCommand) => void>()} />,
      ),
    ).toBe("");
  });

  it("waits for animations and does not offer an empty or completed choice", () => {
    const state = createBreedingState();
    const send = vi.fn<(command: ManualCommand) => void>();
    expect(renderToStaticMarkup(<ManualBreedingPrompt state={state} seat={0} presenting send={send} />)).toBe("");
    state.manual.canHatch = false;
    expect(renderToStaticMarkup(<ManualBreedingPrompt state={state} seat={0} send={send} />)).toBe("");
    state.manual.canHatch = true;
    state.manual.turnPhase = Phase.Main;
    expect(renderToStaticMarkup(<ManualBreedingPrompt state={state} seat={0} send={send} />)).toBe("");
  });

  it("yields the dialog to undo, result and restart agreements", () => {
    const state = createBreedingState();
    const send = vi.fn<(command: ManualCommand) => void>();
    for (const field of ["undoRequester", "resultRequester", "restartRequester"] as const) {
      state.manual[field] = 1;
      expect(renderToStaticMarkup(<ManualBreedingPrompt state={state} seat={0} send={send} />)).toBe("");
      state.manual[field] = -1;
    }
  });

  it("shows phase progress without arbitrary phase-changing buttons", () => {
    const markup = renderToStaticMarkup(
      <ManualCombatControls state={createBreedingState()} seat={0} send={vi.fn<(command: ManualCommand) => void>()} />,
    );
    expect(markup).toContain('aria-current="step"');
    expect(markup).not.toContain("<button");
    expect(markup).toContain("manual.turn.automatic");
  });
});
