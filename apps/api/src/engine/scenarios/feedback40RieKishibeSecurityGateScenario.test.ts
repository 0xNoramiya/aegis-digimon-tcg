import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const RIE = "dev-perm-0-feedback40-rie";
const PAYMENT = "dev-field-0-feedback40-payment";
const LORDKNIGHTMON = ["dev-feedback40-lordknightmon-0", "dev-feedback40-lordknightmon-1"];

async function endTurnWithRie(securityCount: number) {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  layDevScenario("arena-feedback40-rie-kishibe-security-gate", s.state, [BLUE_DECK, RED_DECK]);
  const human = s.state.players[0]!;
  human.security.splice(0, human.security.length - securityCount);

  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && !s.state.pendingDecision);

  const finish = async () => {
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  };
  const riePrompts = s.decisions
    .filter(({ req }) => req.sourceCardId === "BT22-090" && req.kind === "optional")
    .map(({ req }) => req.promptText);
  return { s, human, riePrompts, finish };
}

describe("Feedback #40: Rie Kishibe end-of-turn digivolution into LordKnightmon", () => {
  it("pays the By deletion but keeps Rie a Tamer with 5 security cards (Q4959, match 4d17a450)", async () => {
    const { human, riePrompts, finish } = await endTurnWithRie(5);

    expect(human.security).toHaveLength(5);
    // Follow-up to #40: no LordKnightmon can legally digivolve, so only the By cost is offered,
    // never a "Digivolve" yes/no that would do nothing.
    expect(riePrompts).toHaveLength(1);
    expect(riePrompts[0]).toMatch(/^Pay cost: By deleting/);
    expect(human.trash.map(({ instanceId }) => instanceId)).toContain(PAYMENT);
    const rie = human.battleArea.find(({ permanentId }) => permanentId === RIE);
    expect(rie?.topCard.cardId).toBe("BT22-090");
    expect(rie?.stack).toHaveLength(0);
    expect(human.hand.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining(LORDKNIGHTMON));
    await finish();
  });

  it("digivolves the same board into EX13-064 once security is down to 3", async () => {
    const { human, riePrompts, finish } = await endTurnWithRie(3);

    expect(riePrompts).toEqual([expect.stringMatching(/^Pay cost: By deleting/), "Digivolve"]);

    expect(human.trash.map(({ instanceId }) => instanceId)).toContain(PAYMENT);
    const lord = human.battleArea.find(({ permanentId }) => permanentId === RIE);
    expect(lord?.topCard.cardId).toBe("EX13-064");
    expect(lord?.stack.map(({ cardId }) => cardId)).toEqual(["BT22-090"]);
    expect(human.hand.filter(({ instanceId }) => LORDKNIGHTMON.includes(instanceId))).toHaveLength(1);
    await finish();
  });
});
