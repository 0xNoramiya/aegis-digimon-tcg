import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("Feedback #15 playable Gryphonmon to Deramon scenario", () => {
  it("offers Deramon and Toropiamon to Parasaurmon and digivolves into Deramon for free", async () => {
    const preferInstanceIds = ["dev-perm-0-feedback15-parasaurmon", "dev-feedback15-deramon"];
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    layDevScenario("arena-feedback15-gryphonmon-deramon", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const parasaurmon = human.battleArea.find(
      (permanent) => permanent.permanentId === "dev-perm-0-feedback15-parasaurmon",
    )!;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-feedback15-gryphonmon",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => parasaurmon.topCard.cardId === "BT21-038" && s.state.pendingDecision === undefined);

    const evolutionChoices = s.decisions
      .map(({ req }) => req.options?.candidateInstanceIds ?? [])
      .find((ids) => ids.includes("dev-feedback15-toropiamon"));
    expect(evolutionChoices).toEqual(expect.arrayContaining(["dev-feedback15-deramon", "dev-feedback15-toropiamon"]));
    expect(parasaurmon.stack.map((card) => card.cardId)).toEqual(["EX9-040"]);
    expect(human.hand.map((card) => card.instanceId)).toContain("dev-feedback15-toropiamon");
    expect(s.state.memory).toBe(3);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
