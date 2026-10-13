import "#api/cards/index";
import type { DecisionRequest, DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "#api/engine/testkit/advance";
import { settle, type EngineSetup } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/ladydevimon-option-use-after-trash-cost.fixture";

const optionUseKey = "BT25-083/trash-source-use-option";

function respond(s: EngineSetup, request: DecisionRequest, useOption: boolean): DecisionResponse {
  const candidates = request.options?.candidateInstanceIds ?? [];
  switch (request.kind) {
    case "orderTriggers":
      return { kind: "orderTriggers", order: [...(request.options?.triggerKeys ?? [])] };
    case "optional":
      return { kind: "optional", accept: request.options?.effectKey === optionUseKey };
    case "selectCards":
      if (request.options?.effectKey === optionUseKey) {
        return { kind: "selectCards", instanceIds: useOption ? [s.inst("trashOption").instanceId] : [] };
      }
      return { kind: "selectCards", instanceIds: candidates.slice(0, request.options?.min ?? 0) };
    case "chooseTargets":
      return { kind: "chooseTargets", instanceIds: candidates.slice(0, Math.max(1, request.options?.min ?? 0)) };
    default:
      throw new Error(`Unexpected decision ${request.kind}`);
  }
}

async function digivolveAndResolve(s: EngineSetup, useOption: boolean) {
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("ladyDevimon").instanceId,
    }),
  ).toEqual({ ok: true });
  for (let step = 0; step < 20; step++) {
    await settle(() => s.state.pendingDecision !== undefined || s.engine.mainVerbContinuationsInFlight === 0);
    const pending = s.state.pendingDecision;
    if (pending === undefined) return;
    const request = s.decisions.at(-1)!.req;
    expect(request.decisionId).toBe(pending.decisionId);
    expect(
      s.engine.applyIntent(request.seat, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: respond(s, request, useOption),
      }),
    ).toEqual({ ok: true });
  }
  throw new Error("Decisions did not settle");
}

describe("BT25-083 LadyDevimon Option use after the trash cost", () => {
  it.each([
    { useOption: false, memory: 7, opponentSecurity: 3 },
    { useOption: true, memory: 4, opponentSecurity: 2 },
  ])(
    "lets the player decline or use the Option after trashing a source (use: $useOption)",
    async ({ useOption, memory, opponentSecurity }) => {
      const s = setupScenario(fixture);
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);

      await digivolveAndResolve(s, useOption);

      const optionChoice = s.decisions.find(
        ({ req }) => req.kind === "selectCards" && req.options?.effectKey === optionUseKey,
      )?.req;
      expect(optionChoice?.options).toMatchObject({ min: 0, max: 1 });
      expect(s.perm("base").stack.map((card) => card.instanceId)).not.toContain(s.inst("sourceOption").instanceId);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.memory).toBe(memory);
      expect(s.state.players[1]!.security).toHaveLength(opponentSecurity);

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  );
});
