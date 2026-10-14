import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/monica-reacts-to-placed-ts-option.fixture";
import "#api/cards/index";

const MONICA = "BT25-091";

async function playMonicaThenTheater(acceptMonica: boolean) {
  const s = setupScenario(fixture);
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

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monica").instanceId })).toEqual({
      ok: true,
    });
    expect(await nextDecision()).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("inBetweenTheater").instanceId })).toEqual({
      ok: true,
    });
    const revealedChoices: string[][] = [];
    let monicaOffered = false;
    for (let decision = await nextDecision(); decision !== undefined; decision = await nextDecision()) {
      if (decision.sourceCardId === MONICA && decision.kind === "optional") {
        monicaOffered = true;
        respond({ kind: "optional", accept: acceptMonica });
      } else if (decision.kind === "selectCards") {
        const candidates = decision.options!.candidateInstanceIds!;
        revealedChoices.push(candidates);
        respond({ kind: "selectCards", instanceIds: [candidates[0]!] });
      } else {
        throw new Error(`unexpected ${decision.kind} decision from ${decision.sourceCardId}`);
      }
    }
    return { s, revealedChoices, monicaOffered };
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
}

it("Monica offers her suspend after In-Between Theater places itself in the battle area", async () => {
  const { s, revealedChoices, monicaOffered } = await playMonicaThenTheater(true);
  const human = s.state.players[0]!;

  expect(revealedChoices).toEqual([[s.inst("revealedTsDigimon").instanceId]]);
  expect(human.hand.map((card) => card.instanceId)).toContain(s.inst("revealedTsDigimon").instanceId);
  expect(human.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
    s.inst("inBetweenTheater").instanceId,
  );
  expect(monicaOffered).toBe(true);
  expect(s.perm("monica").isSuspended).toBe(true);
  expect(s.perm("opponentDigimon").cannotAttack).toBe(true);
});

it("Monica stays active when her player declines the suspend after In-Between Theater", async () => {
  const { s, monicaOffered } = await playMonicaThenTheater(false);

  expect(monicaOffered).toBe(true);
  expect(s.perm("monica").isSuspended).toBe(false);
  expect(s.perm("opponentDigimon").cannotAttack).toBe(false);
});
