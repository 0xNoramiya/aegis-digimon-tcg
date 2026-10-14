import { expect, it } from "vitest";
import { Phase, type DecisionRequest, type DecisionResponse } from "@aegis/shared";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/monarchlizamon-tamer-source-de-digivolve.fixture";
import "#api/cards/BT25/BT25-057";
import "#api/cards/BT25/BT25-049";
import "#api/cards/ST23/ST23-13";
import "#api/cards/ST23/ST23-15";
import "#api/cards/BT26/BT26-093";
import "#api/cards/BT26/BT26-089";
import "#api/cards/P/P-236";

it("Arts Digivolved Monarchlizamon pays its De-Digivolve with a chosen Tamer's bottom face-down card", async () => {
  const s = setupScenario(fixture, { autoOrderTriggers: false });
  let answered: string | undefined;
  const next = async (): Promise<DecisionRequest> => {
    await settle(() => s.state.pendingDecision?.seat === 0 && s.state.pendingDecision.decisionId !== answered);
    return s.decisions.at(-1)!.req;
  };
  const respond = (request: DecisionRequest, response: DecisionResponse) => {
    answered = request.decisionId;
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: request.decisionId, response })).toEqual({
      ok: true,
    });
  };
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    const turnStart = await next();
    const turnStartKeys = turnStart.options!.triggerKeys!;
    respond(turnStart, {
      kind: "orderTriggers",
      order: [...turnStartKeys],
      optionalAnswers: Object.fromEntries(turnStartKeys.map((key) => [key, false])),
    });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monarchlizamon").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    const reduction = await next();
    expect(reduction).toMatchObject({ kind: "optional", sourceCardId: "BT25-049" });
    respond(reduction, { kind: "optional", accept: false });
    const followUpAttack = await next();
    expect(followUpAttack).toMatchObject({ kind: "optional", sourceCardId: "BT25-057" });
    respond(followUpAttack, { kind: "optional", accept: true });
    const attackTarget = await next();
    expect(attackTarget.options?.candidateInstanceIds).toEqual(["player"]);
    respond(attackTarget, { kind: "selectCards", instanceIds: ["player"] });
    const arts = await next();
    expect(arts.promptText).toContain("Arts Digivolve");
    respond(arts, { kind: "selectCards", instanceIds: [s.perm("armalizamon").topCard.instanceId] });

    const entry = await next();
    expect(entry.kind).toBe("orderTriggers");
    const deDigivolveKey = entry.options!.triggerKeys!.find((key) => key.includes("BT25-057/ir-shared-0"))!;
    expect(deDigivolveKey).toBeDefined();
    respond(entry, { kind: "orderTriggers", order: [deDigivolveKey] });
    const activation = await next();
    expect(activation).toMatchObject({ kind: "optional", sourceCardId: "BT25-057" });
    respond(activation, { kind: "optional", accept: true });

    const tamerCost = await next();
    expect(tamerCost).toMatchObject({ kind: "selectCards", options: { purpose: "cost", min: 1, max: 1 } });
    expect(tamerCost.options?.candidateInstanceIds).toEqual([
      s.inst("tomoro").instanceId,
      s.inst("reina").instanceId,
      s.inst("kyo").instanceId,
    ]);
    respond(tamerCost, { kind: "selectCards", instanceIds: [s.inst("reina").instanceId] });

    const target = await next();
    expect(s.perm("reina").stack.map((card) => card.instanceId)).toEqual([s.inst("reinaTopSource").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("reinaBottomSource").instanceId);
    expect(target.kind).toBe("chooseTargets");
    expect(target.options?.candidateInstanceIds).toContain(s.perm("jesmon").permanentId);
    respond(target, { kind: "chooseTargets", instanceIds: [s.perm("jesmon").permanentId] });
    await settle(() => s.perm("jesmon").topCard.instanceId === s.inst("jesmonPrevious").instanceId);
    expect(s.perm("jesmon").stack.map((card) => card.instanceId)).toEqual([
      s.inst("jesmonBase").instanceId,
      s.inst("jesmonMiddle").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["EX13-014"]);
    expect(s.perm("armalizamon").topCard.instanceId).toBe(s.inst("monarchlizamon").instanceId);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
