import "#api/cards/index";
import type { DecisionRequest, DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "#api/engine/testkit/advance";
import { settle, type EngineSetup } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/cool-boy-king-drasil-reduced-royal-knight-play.fixture";

const coolBoyKey = "EX11-071/ir-27-0";
const reducerSources = new Set(["EX11-071", "BT13-007"]);

function respond(s: EngineSetup, request: DecisionRequest, chosen: string): DecisionResponse {
  const candidates = request.options?.candidateInstanceIds ?? [];
  switch (request.kind) {
    case "orderTriggers":
      return { kind: "orderTriggers", order: [...(request.options?.triggerKeys ?? [])] };
    case "orderCards":
      return { kind: "orderCards", order: [...candidates] };
    case "optional":
      return { kind: "optional", accept: reducerSources.has(request.sourceCardId ?? "") };
    case "selectCards":
      if (request.options?.effectKey === coolBoyKey) {
        return { kind: "selectCards", instanceIds: [s.inst(chosen).instanceId] };
      }
      return { kind: "selectCards", instanceIds: candidates.slice(0, request.options?.min ?? 0) };
    case "chooseTargets":
      return { kind: "chooseTargets", instanceIds: candidates.slice(0, request.options?.min ?? 0) };
    default:
      throw new Error(`Unexpected decision ${request.kind}`);
  }
}

async function resolveDecisions(s: EngineSetup, chosen: string) {
  for (let step = 0; step < 30; step++) {
    await settle(() => s.state.pendingDecision !== undefined || s.engine.mainVerbContinuationsInFlight === 0);
    const pending = s.state.pendingDecision;
    if (pending === undefined) return;
    const request = s.decisions.at(-1)!.req;
    expect(request.decisionId).toBe(pending.decisionId);
    expect(
      s.engine.applyIntent(request.seat, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: respond(s, request, chosen),
      }),
    ).toEqual({ ok: true });
  }
  throw new Error("Decisions did not settle");
}

async function activateCoolBoy(s: EngineSetup, chosen: string) {
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.inst("coolBoy").instanceId,
      effectKey: coolBoyKey,
    }),
  ).toEqual({ ok: true });
  await resolveDecisions(s, chosen);
  return s.decisions.find(({ req }) => req.kind === "selectCards" && req.options?.effectKey === coolBoyKey)?.req;
}

describe("EX11-071 Cool Boy paid play with King Drasil_7D6 in breeding", () => {
  it("offers a Royal Knight that only King Drasil's reduction makes payable and plays it", async () => {
    const s = setupScenario(fixture);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("kingDrasil").stack).toHaveLength(5);

    const playChoice = await activateCoolBoy(s, "examon");

    expect(playChoice?.options?.candidateInstanceIds).toEqual([
      s.inst("examon").instanceId,
      s.inst("magnamon").instanceId,
      s.inst("secondMagnamon").instanceId,
      s.inst("omekamon").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("examon").instanceId,
    );
    expect({ turnSeat: s.state.turnSeat, memory: s.state.memory }).toEqual({ turnSeat: 1, memory: 3 });

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not offer that Royal Knight after King Drasil's reduction was used this turn", async () => {
    const s = setupScenario(fixture);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magnamon").instanceId })).toEqual({
      ok: true,
    });
    await resolveDecisions(s, "omekamon");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("magnamon").instanceId,
    );
    expect({ turnSeat: s.state.turnSeat, memory: s.state.memory }).toEqual({ turnSeat: 0, memory: 1 });

    const playChoice = await activateCoolBoy(s, "omekamon");

    expect(playChoice?.options?.candidateInstanceIds).toEqual([
      s.inst("secondMagnamon").instanceId,
      s.inst("omekamon").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("examon").instanceId);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
