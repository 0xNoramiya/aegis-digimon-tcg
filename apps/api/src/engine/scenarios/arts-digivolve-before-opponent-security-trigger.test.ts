import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import type { ServerEvent } from "@aegis/shared";
import "#api/cards/index";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle, settleAcrossTimers, type EngineSetup } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/arts-digivolve-before-opponent-security-trigger.fixture";

const WISEMON_SECURITY_EFFECT = "EX13-034/ir-35-1";

function isWisemonSecurityEffect(event: ServerEvent, kind: "effectTriggered" | "effectResolved"): boolean {
  return event.kind === kind && event.sourceCardId === "EX13-034" && event.effectKey.includes(WISEMON_SECURITY_EFFECT);
}

function indexOfEvent(s: EngineSetup, predicate: (event: ServerEvent) => boolean): number {
  return s.events.findIndex(predicate);
}

function answer(s: EngineSetup, seat: 0 | 1, intent: Parameters<EngineSetup["engine"]["applyIntent"]>[1]) {
  expect(s.engine.applyIntent(seat, intent)).toEqual({ ok: true });
}

async function useWidePlasmentAgainstProtectedWisemon(s: EngineSetup) {
  await settle(() => s.state.phase === Phase.Breeding);
  answer(s, 0, { type: "endPhase" });
  await settle(() => s.state.phase === Phase.Main);
  answer(s, 0, { type: "playCard", instanceId: s.inst("wide-plasment").instanceId, useAs: "option" });

  await settleAcrossTimers(() => s.state.pendingDecision !== undefined);
  const prevent = s.decisions.at(-1)!.req;
  expect(prevent).toMatchObject({ seat: 1, kind: "optional", sourceCardId: "EX13-029" });
  answer(s, 1, {
    type: "respondDecision",
    decisionId: prevent.decisionId,
    response: { kind: "optional", accept: true },
  });

  await settleAcrossTimers(() => s.state.pendingDecision?.decisionId !== prevent.decisionId);
  const arts = s.decisions.at(-1)!.req;
  expect(arts).toMatchObject({
    seat: 0,
    kind: "selectCards",
    sourceCardId: "BT26-033",
    options: { candidateInstanceIds: [s.inst("arts-base-card").instanceId] },
  });
  expect(s.state.players[1]!.security).toHaveLength(2);
  expect(s.perm("arts-base").topCard.cardId).toBe("BT25-025");
  expect(s.events.some((event) => isWisemonSecurityEffect(event, "effectTriggered"))).toBe(false);
  return arts;
}

describe("Arts Digivolve before an opponent's security-removal trigger", () => {
  it("digivolves first, then resolves the turn player's [When Digivolving] before Wisemon", async () => {
    const s = setupScenario(fixture, { autoOrderTriggers: false });
    const loop = s.engine.startTurnLoop();
    try {
      const arts = await useWidePlasmentAgainstProtectedWisemon(s);
      answer(s, 0, {
        type: "respondDecision",
        decisionId: arts.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("arts-base-card").instanceId] },
      });
      await settleAcrossTimers(
        () =>
          s.state.pendingDecision === undefined &&
          s.events.some((event) => isWisemonSecurityEffect(event, "effectResolved")),
      );

      const digivolved = indexOfEvent(s, (event) => event.kind === "digivolved" && event.cardId === "BT26-033");
      const whenDigivolving = indexOfEvent(
        s,
        (event) =>
          event.kind === "effectResolved" && event.sourceCardId === "BT26-033" && event.timing === "WhenDigivolving",
      );
      const wisemonTriggered = indexOfEvent(s, (event) => isWisemonSecurityEffect(event, "effectTriggered"));
      expect(digivolved).toBeGreaterThanOrEqual(0);
      expect(whenDigivolving).toBeGreaterThan(digivolved);
      expect(wisemonTriggered).toBeGreaterThan(whenDigivolving);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-033");
      expect(s.perm("arts-base").topCard.cardId).toBe("BT25-025");
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("resolves Wisemon only after the declined Option is trashed", async () => {
    const s = setupScenario(fixture, { autoOrderTriggers: false });
    const loop = s.engine.startTurnLoop();
    try {
      const arts = await useWidePlasmentAgainstProtectedWisemon(s);
      answer(s, 0, {
        type: "respondDecision",
        decisionId: arts.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      });
      await settleAcrossTimers(
        () =>
          s.state.pendingDecision === undefined &&
          s.events.some((event) => isWisemonSecurityEffect(event, "effectResolved")),
      );

      const trashed = indexOfEvent(
        s,
        (event) => event.kind === "cardsMoved" && event.optionUsed === true && event.to === "trash",
      );
      const wisemonTriggered = indexOfEvent(s, (event) => isWisemonSecurityEffect(event, "effectTriggered"));
      expect(trashed).toBeGreaterThanOrEqual(0);
      expect(wisemonTriggered).toBeGreaterThan(trashed);
      expect(s.perm("arts-base").topCard.cardId).toBe("BT24-034");
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
