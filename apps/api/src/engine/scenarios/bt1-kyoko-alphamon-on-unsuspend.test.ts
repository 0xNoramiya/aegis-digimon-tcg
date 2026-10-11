import fixtureBt22101KyokoAlphamonOnUnsuspend from "./bt22-101-kyoko-alphamon-on-unsuspend.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const KYOKO = fixturePermanentId("own-bt22-101-kyoko");
const ALPHAMON = fixtureInstanceId("bt22-101-alphamon-card");

async function startTurnWithKyoko(securityCount: number) {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  layScenarioFixture(s.state, fixtureBt22101KyokoAlphamonOnUnsuspend, [BLUE_DECK, RED_DECK], true);
  const human = s.state.players[0]!;
  while (human.security.length < securityCount) human.security.push(human.deck.pop()!);

  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding && !s.state.pendingDecision);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);

  const kyokoPrompts = s.decisions
    .filter(({ req }) => req.sourceCardId === "BT22-101" && req.kind === "optional")
    .map(({ req }) => req.promptText);
  const finish = async () => {
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  };
  return { s, human, kyokoPrompts, finish };
}

describe("BT22-101 Kyoko Kuremi digivolves into Alphamon when she unsuspends", () => {
  it("asks Digivolve and becomes BT22-063 with 3 security cards (Q4976)", async () => {
    const { s, human, kyokoPrompts, finish } = await startTurnWithKyoko(3);

    expect(kyokoPrompts).toEqual(["Digivolve"]);
    const alphamon = human.battleArea.find(({ permanentId }) => permanentId === KYOKO);
    expect(alphamon?.topCard.cardId).toBe("BT22-063");
    expect(alphamon?.stack.map(({ cardId }) => cardId)).toEqual(["BT22-101"]);
    expect(human.hand.some(({ instanceId }) => instanceId === ALPHAMON)).toBe(false);
    expect(s.state.memory).toBe(1);
    await finish();
  });

  it("stays a Tamer without a prompt with 4 security cards, because Alphamon's requirement is unmet", async () => {
    const { s, human, kyokoPrompts, finish } = await startTurnWithKyoko(4);

    expect(human.security).toHaveLength(4);
    expect(kyokoPrompts).toEqual([]);
    const kyoko = human.battleArea.find(({ permanentId }) => permanentId === KYOKO);
    expect(kyoko?.topCard.cardId).toBe("BT22-101");
    expect(kyoko?.isSuspended).toBe(false);
    expect(human.hand.some(({ instanceId }) => instanceId === ALPHAMON)).toBe(true);
    expect(s.state.memory).toBe(4);
    await finish();
  });
});
