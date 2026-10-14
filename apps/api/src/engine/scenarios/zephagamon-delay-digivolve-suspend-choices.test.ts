import { expect, it } from "vitest";
import { Phase, type DecisionRequest } from "@aegis/shared";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/zephagamon-delay-digivolve-suspend-choices.fixture";
import "#api/cards/index";

type Scenario = ReturnType<typeof setupScenario>;

function openDecision(s: Scenario): DecisionRequest | undefined {
  const pending = s.state.pendingDecision?.decisionId;
  const latest = s.decisions.at(-1)?.req;
  return latest !== undefined && latest.decisionId === pending ? latest : undefined;
}

async function nextDecision(s: Scenario, answered: Set<string>): Promise<DecisionRequest> {
  await settle(() => {
    const decision = openDecision(s);
    return decision !== undefined && !answered.has(decision.decisionId);
  });
  const decision = openDecision(s)!;
  answered.add(decision.decisionId);
  return decision;
}

function respond(s: Scenario, decision: DecisionRequest, response: Record<string, unknown>) {
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: decision.kind, ...response } as never,
    }),
  ).toEqual({ ok: true });
}

it("Zephagamon digivolved mid-attack offers only suspended Digimon to unsuspend, then every Digimon to suspend", async () => {
  const s = setupScenario(fixture);
  const loop = s.engine.startTurnLoop();
  const answered = new Set<string>();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const attacker = s.perm("attacker").permanentId;
    const standingPteromon = s.perm("standingPteromon").permanentId;
    const opponentStanding = s.perm("opponentStanding").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attacker, target: { kind: "player" } }),
    ).toEqual({ ok: true });

    const shotoCost = await nextDecision(s, answered);
    expect(shotoCost).toMatchObject({ kind: "optional", sourceCardId: "EX11-062" });
    respond(s, shotoCost, { accept: true });
    const shotoBoost = await nextDecision(s, answered);
    expect(shotoBoost).toMatchObject({ kind: "chooseTargets", sourceCardId: "EX11-062" });
    respond(s, shotoBoost, { instanceIds: [attacker] });
    const delay = await nextDecision(s, answered);
    expect(delay).toMatchObject({ kind: "optional", sourceCardId: "EX11-072" });
    respond(s, delay, { accept: true });

    const unsuspend = await nextDecision(s, answered);
    expect(s.perm("attacker").topCard.cardId).toBe("EX11-035");
    expect(unsuspend).toMatchObject({ kind: "chooseTargets", sourceCardId: "EX11-035" });
    expect(unsuspend.options?.targetFate).toBe("unsuspend");
    expect(unsuspend.options?.min).toBe(0);
    expect(unsuspend.options?.candidateInstanceIds).toEqual([attacker]);
    respond(s, unsuspend, { instanceIds: [] });

    const suspend = await nextDecision(s, answered);
    expect(suspend).toMatchObject({ kind: "chooseTargets", sourceCardId: "EX11-035" });
    expect(suspend.options?.targetFate).toBe("suspend");
    expect(suspend.options?.min).toBe(0);
    expect([...(suspend.options?.candidateInstanceIds ?? [])].sort()).toEqual(
      [attacker, standingPteromon, opponentStanding].sort(),
    );
    respond(s, suspend, { instanceIds: [standingPteromon] });

    await settle(() => s.perm("standingPteromon").isSuspended);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("opponentStanding").isSuspended).toBe(false);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
