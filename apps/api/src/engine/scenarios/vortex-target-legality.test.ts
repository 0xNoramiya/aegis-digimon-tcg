import fixtureVortexTargetLegality from "./vortex-target-legality.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import "../../cards/index.js";

describe("arena-vortex-target-legality dev scenario", () => {
  it("stages one suspended valid target and one unsuspended invalid target", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layScenarioFixture(state, fixtureVortexTargetLegality, [BLUE_DECK, RED_DECK], true);

    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(0);
    expect([...state.players[0]!.battleArea]).toEqual([
      expect.objectContaining({
        permanentId: fixturePermanentId("you-vortex-target-attacker"),
        isSuspended: false,
        topCard: expect.objectContaining({ cardId: "EX7-034" }),
      }),
    ]);
    expect([...state.players[1]!.battleArea]).toEqual([
      expect.objectContaining({ permanentId: fixturePermanentId("opponent-vortex-valid-target"), isSuspended: true }),
      expect.objectContaining({
        permanentId: fixturePermanentId("opponent-vortex-invalid-target"),
        isSuspended: false,
      }),
    ]);
  });
});
