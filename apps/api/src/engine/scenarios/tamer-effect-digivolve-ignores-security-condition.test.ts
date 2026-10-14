import fixtureTamerEffectDigivolveIgnoresSecurityCondition from "./tamer-effect-digivolve-ignores-security-condition.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const RIE = fixturePermanentId("own-rie");
const RIE_CARD = fixtureInstanceId("own-card-rie-card");
const LORDKNIGHTMON = fixtureInstanceId("lordknightmon-card");
const SOURCES = [
  fixtureInstanceId("rie-source-gladimon-0-card"),
  fixtureInstanceId("rie-source-skullknightmon-card"),
  fixtureInstanceId("rie-source-gladimon-1-card"),
];

async function openMainWithFourSecurity() {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  layScenarioFixture(s.state, fixtureTamerEffectDigivolveIgnoresSecurityCondition, [BLUE_DECK, RED_DECK], true);
  const human = s.state.players[0]!;
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const rie = () => human.battleArea.find(({ permanentId }) => permanentId === RIE)!;
  const finish = async () => {
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  };
  return { s, human, rie, finish };
}

describe("Rie Kishibe EX13-074 [Main] digivolution with 4 security cards", () => {
  it("refuses LordKnightmon's [Rie Kishibe] requirement while security is above 3", async () => {
    const { s, human, rie, finish } = await openMainWithFourSecurity();
    try {
      expect(human.security).toHaveLength(4);
      const result = s.engine.applyIntent(0, { type: "digivolve", permanentId: RIE, instanceId: LORDKNIGHTMON });
      expect(result.ok).toBe(false);
      await settle();
      expect(rie().topCard.instanceId).toBe(RIE_CARD);
      expect(human.hand.map(({ instanceId }) => instanceId)).toContain(LORDKNIGHTMON);
      expect(s.state.memory).toBe(3);
    } finally {
      await finish();
    }
  });

  it("digivolves into LordKnightmon for 3 through its [Main] effect, ignoring the security condition", async () => {
    const { s, human, rie, finish } = await openMainWithFourSecurity();
    try {
      const [main] = observe(s.engine).activatableEffects(rie()) as { effectKey: string }[];
      expect(main?.effectKey).toMatch(/^EX13-074\//);
      expect(
        s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: RIE_CARD, effectKey: main!.effectKey }),
      ).toEqual({ ok: true });
      await settle(() => rie().topCard.instanceId === LORDKNIGHTMON && !s.state.pendingDecision);

      expect(human.security).toHaveLength(4);
      expect(s.state.memory).toBe(0);
      expect(rie().stack.map(({ instanceId }) => instanceId)).toEqual([...SOURCES, RIE_CARD]);
      expect(human.hand.map(({ instanceId }) => instanceId)).not.toContain(LORDKNIGHTMON);
    } finally {
      await finish();
    }
  });
});
