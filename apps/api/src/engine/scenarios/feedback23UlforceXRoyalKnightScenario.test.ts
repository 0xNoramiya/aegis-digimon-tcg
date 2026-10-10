import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("Feedback #23 playable EX13 Veemon scenario", () => {
  it("offers UlforceVeedramon (X Antibody) in the production reveal and adds it to the hand", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true });
    layDevScenario("arena-feedback23-ulforce-x-royal-knight", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    expect(human.deck.slice(0, 3).map((card) => card.cardId)).toEqual(["BT22-023", "P-138", "BT12-029"]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-feedback23-veemon" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pick = s.state.pendingDecision!;
    const payload = JSON.parse(pick.payloadJson) as { candidateInstanceIds?: string[]; max?: number };
    expect([...(payload.candidateInstanceIds ?? [])].sort()).toEqual(
      ["dev-feedback23-aeroveedramon", "dev-feedback23-ulforce-x", "dev-feedback23-veedramon"].sort(),
    );
    expect(payload.max).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pick.decisionId,
        response: { kind: "selectCards", instanceIds: ["dev-feedback23-ulforce-x"] },
      }),
    ).toEqual({ ok: true });
    await settle(() => human.hand.some((card) => card.instanceId === "dev-feedback23-ulforce-x"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(human.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX13-017"]);
    expect(
      human.deck
        .slice(-2)
        .map((card) => card.instanceId)
        .sort(),
    ).toEqual(["dev-feedback23-aeroveedramon", "dev-feedback23-veedramon"].sort());

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    s.engine.expireMatchTimer(0);
    await loop;
  });
});
