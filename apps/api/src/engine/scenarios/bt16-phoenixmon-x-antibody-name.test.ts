import fixtureBt16PhoenixmonXAntibodyName from "./bt16-phoenixmon-x-antibody-name.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { GameState, Phase, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

const SCENARIO = fixtureBt16PhoenixmonXAntibodyName;
const TRAIT_ONLY = fixturePermanentId("phoenixmon-x-wargrowlmon-x-only");
const NAMED_OPTION = fixturePermanentId("phoenixmon-x-antibody-option");

describe("BT16 Phoenixmon (X Antibody) [X Antibody] name dev scenario", () => {
  it("stages one Phoenixmon X over WarGrowlmon X, one over the X Antibody Option, and three targets", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layScenarioFixture(state, SCENARIO, [RED_DECK, BLUE_DECK], true);

    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(5);
    const [traitOnly, namedOption] = state.players[0]!.battleArea;
    expect(traitOnly).toMatchObject({ permanentId: TRAIT_ONLY, topCard: { cardId: "BT16-015" } });
    expect(traitOnly!.stack.map(({ cardId }) => cardId)).toEqual(["BT13-014", "BT9-014"]);
    expect(namedOption).toMatchObject({ permanentId: NAMED_OPTION, topCard: { cardId: "BT16-015" } });
    expect(namedOption!.stack.map(({ cardId }) => cardId)).toEqual(["BT9-109", "BT13-014"]);
    expect(state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      fixturePermanentId("phoenixmon-x-first-target"),
      fixturePermanentId("phoenixmon-x-second-target"),
      fixturePermanentId("phoenixmon-x-third-target"),
    ]);
  });

  it("attaches End of Attack only to the Phoenixmon X with the X Antibody Option underneath", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, SCENARIO, [RED_DECK, BLUE_DECK], true);
    await s.ready();

    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const projected = advance(s.engine)
      .ledgers.continuous.listOnDeletionAtEndOfAttackProjections()
      .map(({ permanentId }) => permanentId);
    expect(projected).toContain(NAMED_OPTION);
    expect(projected).not.toContain(TRAIT_ONLY);

    const opponentIds = () => s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId);
    const attack = async (attackerPermanentId: string, targetPermanentId: string) => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId,
          target: { kind: "permanent", permanentId: targetPermanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    };

    await attack(TRAIT_ONLY, fixturePermanentId("phoenixmon-x-first-target"));
    expect(opponentIds()).toEqual([
      fixturePermanentId("phoenixmon-x-second-target"),
      fixturePermanentId("phoenixmon-x-third-target"),
    ]);

    await attack(NAMED_OPTION, fixturePermanentId("phoenixmon-x-second-target"));
    expect(opponentIds()).toEqual([]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
