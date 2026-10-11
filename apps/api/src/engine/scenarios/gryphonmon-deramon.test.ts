import fixtureGryphonmonDeramon from "./gryphonmon-deramon.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("playable Gryphonmon to Deramon scenario", () => {
  it("offers Deramon and Toropiamon to Parasaurmon and digivolves into Deramon for free", async () => {
    const preferInstanceIds = [fixturePermanentId("own-parasaurmon"), fixtureInstanceId("deramon-card")];
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    layScenarioFixture(s.state, fixtureGryphonmonDeramon, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const parasaurmon = human.battleArea.find(
      (permanent) => permanent.permanentId === fixturePermanentId("own-parasaurmon"),
    )!;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fixturePermanentId("own-gryphonmon"),
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => parasaurmon.topCard.cardId === "BT21-038" && s.state.pendingDecision === undefined);

    const evolutionChoices = s.decisions
      .map(({ req }) => req.options?.candidateInstanceIds ?? [])
      .find((ids) => ids.includes(fixtureInstanceId("toropiamon-card")));
    expect(evolutionChoices).toEqual(
      expect.arrayContaining([fixtureInstanceId("deramon-card"), fixtureInstanceId("toropiamon-card")]),
    );
    expect(parasaurmon.stack.map((card) => card.cardId)).toEqual(["EX9-040"]);
    expect(human.hand.map((card) => card.instanceId)).toContain(fixtureInstanceId("toropiamon-card"));
    expect(s.state.memory).toBe(3);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
