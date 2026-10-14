import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import type { ScenarioFixture } from "#api/engine/scenario/types";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import fixture, {
  optionUnderTamerFixture,
} from "#api/engine/scenarios/nightchiropmon-tamer-cost-uses-glowing-dawn-option.fixture";
import "#api/cards/index";

const NIGHTCHIROPMON = "BT26-070";

async function useGlowingDawnThroughTamerCost(board: ScenarioFixture, costTamers: string[], acceptUse: boolean) {
  const s = setupScenario(board);
  const loop = s.engine.startTurnLoop();
  const respond = (response: object) => {
    const decisionId = s.state.pendingDecision!.decisionId;
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId, response: response as never })).toEqual({
      ok: true,
    });
  };
  const nextDecision = async () => {
    await settle(() => s.state.pendingDecision !== undefined || s.engine.mainVerbContinuationsInFlight === 0);
    return s.state.pendingDecision === undefined ? undefined : s.decisions.at(-1)!.req;
  };
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    respond({ kind: "optional", accept: false });
    await settle(() => s.state.pendingDecision === undefined);
    const memoryBefore = s.state.memory;
    const nightChiropmon = s.perm("nightChiropmon");
    const [effect] = observe(s.engine).activatableEffects(nightChiropmon);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: nightChiropmon.topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });

    const tamerChoices: string[][] = [];
    const optionChoices: string[][] = [];
    let useOffered = false;
    for (let decision = await nextDecision(); decision !== undefined; decision = await nextDecision()) {
      const fromNightChiropmon = decision.sourceCardId === NIGHTCHIROPMON;
      if (fromNightChiropmon && decision.kind === "selectCards") {
        const candidates = decision.options!.candidateInstanceIds!;
        if (candidates.includes(s.inst("glowingDawn").instanceId)) {
          optionChoices.push(candidates);
          respond({ kind: "selectCards", instanceIds: [s.inst("glowingDawn").instanceId] });
        } else {
          tamerChoices.push(candidates);
          respond({
            kind: "selectCards",
            instanceIds: [s.perm(costTamers[tamerChoices.length - 1]!).topCard.instanceId],
          });
        }
      } else if (fromNightChiropmon && decision.kind === "optional") {
        useOffered = true;
        respond({ kind: "optional", accept: acceptUse });
      } else respond({ kind: "optional", accept: false });
    }
    return { s, memoryBefore, tamerChoices, optionChoices, useOffered };
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
}

it("NightChiropmon uses a Glowing Dawn Option from trash after trashing 2 Tamer cards for 2 less", async () => {
  const { s, memoryBefore, tamerChoices, optionChoices, useOffered } = await useGlowingDawnThroughTamerCost(
    fixture,
    ["reina", "kyo"],
    true,
  );
  const tamerTopCards = ["tomoroAndKyo", "reina", "kyo"].map((alias) => s.perm(alias).topCard.instanceId);
  const human = s.state.players[0]!;

  expect(tamerChoices).toEqual([tamerTopCards, tamerTopCards]);
  expect(useOffered).toBe(true);
  expect(optionChoices).toEqual([[s.inst("glowingDawn").instanceId]]);
  expect(human.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(s.inst("glowingDawn").instanceId);
  expect(human.trash.map((card) => card.instanceId)).toEqual(
    expect.arrayContaining([s.inst("reinaBottom").instanceId, s.inst("kyoBottom").instanceId]),
  );
  expect(s.perm("reina").stack.map((card) => card.instanceId)).toEqual([s.inst("reinaTop").instanceId]);
  expect(s.perm("kyo").stack.map((card) => card.instanceId)).toEqual([s.inst("kyoTop").instanceId]);
  expect(s.state.memory).toBe(memoryBefore - 1);
});

it("NightChiropmon uses the Glowing Dawn Option that its own Tamer cost trashed", async () => {
  const { s, memoryBefore, optionChoices } = await useGlowingDawnThroughTamerCost(
    optionUnderTamerFixture,
    ["tomoroAndKyo", "tomoroAndKyo"],
    true,
  );

  expect(optionChoices).toEqual([[s.inst("glowingDawn").instanceId]]);
  expect(s.perm("tomoroAndKyo").stack).toHaveLength(0);
  expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
    s.inst("glowingDawn").instanceId,
  );
  expect(s.state.memory).toBe(memoryBefore - 1);
});

it("NightChiropmon keeps the Tamer cost paid when the player declines the Option use", async () => {
  const { s, memoryBefore, optionChoices } = await useGlowingDawnThroughTamerCost(fixture, ["reina", "kyo"], false);
  const human = s.state.players[0]!;

  expect(optionChoices).toEqual([]);
  expect(human.trash.map((card) => card.instanceId)).toEqual(
    expect.arrayContaining([
      s.inst("glowingDawn").instanceId,
      s.inst("reinaBottom").instanceId,
      s.inst("kyoBottom").instanceId,
    ]),
  );
  expect(s.state.memory).toBe(memoryBefore);
});
