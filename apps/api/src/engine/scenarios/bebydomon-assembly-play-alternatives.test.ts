import "#api/cards/index";
import type { DecisionRequest, DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "#api/engine/testkit/advance";
import { settle, type EngineSetup } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/bebydomon-assembly-play-alternatives.fixture";

const bebydomonKey = "EX13-005/ir-12-0";

function respond(s: EngineSetup, request: DecisionRequest, chosen: string): DecisionResponse {
  const candidates = request.options?.candidateInstanceIds ?? [];
  switch (request.kind) {
    case "orderTriggers":
      return { kind: "orderTriggers", order: [...(request.options?.triggerKeys ?? [])] };
    case "optional":
      return { kind: "optional", accept: request.options?.effectKey === bebydomonKey };
    case "selectCards":
      if (request.options?.assemblyCardId !== undefined) return { kind: "selectCards", instanceIds: candidates };
      if (request.options?.effectKey === bebydomonKey) {
        return { kind: "selectCards", instanceIds: [s.inst(chosen).instanceId] };
      }
      return { kind: "selectCards", instanceIds: candidates.slice(0, request.options?.min ?? 0) };
    case "chooseTargets":
      return { kind: "chooseTargets", instanceIds: candidates.slice(0, request.options?.min ?? 0) };
    default:
      throw new Error(`Unexpected decision ${request.kind}`);
  }
}

async function attackAndResolve(s: EngineSetup, chosen: string) {
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
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

describe("EX13-005 Bebydomon play with Assembly", () => {
  it.each(["slayerdramon", "breakdramon"])(
    "offers every Assembly Digimon that shares the same trash materials and plays %s",
    async (chosen) => {
      const s = setupScenario(fixture);
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);

      await attackAndResolve(s, chosen);

      const playChoice = s.decisions.find(
        ({ req }) =>
          req.kind === "selectCards" &&
          req.options?.effectKey === bebydomonKey &&
          req.options?.assemblyCardId === undefined,
      )?.req;
      expect(playChoice?.options?.candidateInstanceIds).toEqual(
        expect.arrayContaining([s.inst("slayerdramon").instanceId, s.inst("breakdramon").instanceId]),
      );
      const played = s.state.players[0]!.battleArea.find(
        ({ topCard }) => topCard.instanceId === s.inst(chosen).instanceId,
      );
      expect(played?.stack.map(({ instanceId }) => instanceId)).toEqual(
        expect.arrayContaining([
          s.inst("levelFiveMaterial").instanceId,
          s.inst("levelFourMaterial").instanceId,
          s.inst("levelThreeMaterial").instanceId,
        ]),
      );
      expect({ turnSeat: s.state.turnSeat, memory: s.state.memory }).toEqual({ turnSeat: 1, memory: 6 });

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  );
});
