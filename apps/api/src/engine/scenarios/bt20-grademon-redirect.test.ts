import fixtureBt20GrademonRedirect from "./bt20-grademon-redirect.fixture.js";
import { GameState, Phase, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { createEvaluationPolicy } from "../../bot/policy.js";
import { buildBotView } from "../../bot/view.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { GameEngine, type GameEngineHooks } from "../GameEngine.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import "../../cards/index.js";

describe("BT20 Grademon inherited-redirect dev scenario", () => {
  it("stages a Grademon source beneath the human host and a bot attacker", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layScenarioFixture(state, fixtureBt20GrademonRedirect, [BLUE_DECK, RED_DECK], true);

    expect(state.turnSeat).toBe(1);
    expect(state.players[0]!.battleArea).toHaveLength(1);
    expect(state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT20-056");
    expect(state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(["BT20-053"]);
    expect(state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["ST1-10"]);
  });

  it("makes the bot attack the player so the inherited watcher opens", async () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());
    layScenarioFixture(state, fixtureBt20GrademonRedirect, [BLUE_DECK, RED_DECK], true);
    state.phase = Phase.Main;

    const hooks: GameEngineHooks = { seed: 1, emit: () => {}, requestDecision: () => {} };
    const engine = new GameEngine(state, hooks);
    await engine.recomputeContinuousEffects();

    const attacker = state.players[1]!.battleArea[0]!;
    expect(createEvaluationPolicy({ seed: 1 }).chooseMainAction(buildBotView(state, 1)!)).toEqual({
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
  });
});
