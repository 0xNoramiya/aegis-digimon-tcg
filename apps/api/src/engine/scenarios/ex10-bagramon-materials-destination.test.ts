import fixtureEx10BagramonMaterialsDestination from "./ex10-bagramon-materials-destination.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("— playable Bagramon material and destination arena", () => {
  it.each([
    ["digimon", true],
    ["tamer", true],
    ["tamer", false],
  ] as const)("runs the real turn loop: %s host, All Turns accepted=%s", async (hostKind, acceptCost) => {
    const automation = { autoDeclineOptional: true };
    const s = setupEngine({ 0: {}, 1: {} }, automation);
    layScenarioFixture(s.state, fixtureEx10BagramonMaterialsDestination, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      automation.autoDeclineOptional = false;
      const human = s.state.players[0]!;
      const opponent = s.state.players[1]!;
      const expander = human.battleArea.find(({ topCard }) => topCard.cardId === "EX10-064")!;
      const victim = opponent.battleArea.find(({ topCard }) => topCard.cardId === "BT1-009")!;
      const host = opponent.battleArea.find(
        ({ topCard }) => topCard.cardId === (hostKind === "tamer" ? "BT1-088" : "BT1-014"),
      )!;
      const materials = [
        fixtureInstanceId("own-source-bagramon-expander-0-card"),
        fixtureInstanceId("bagramon-trash-material-card"),
      ];
      const existing = host.stack.map(({ instanceId }) => instanceId);
      const victimTop = victim.topCard.instanceId;
      const shed = victim.stack.map(({ instanceId }) => instanceId);
      const answer = (
        response: { kind: "optional"; accept: boolean } | { kind: "chooseTargets"; instanceIds: string[] },
      ) => {
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: s.state.pendingDecision!.decisionId,
            response,
          }),
        ).toEqual({ ok: true });
      };
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: fixtureInstanceId("bagramon-played-card"),
          digiXros: { materialInstanceIds: materials, expanderPermanentIds: [expander.permanentId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const bagramon = human.battleArea.find(({ topCard }) => topCard.cardId === "EX10-056")!;
      expect(expander.isSuspended).toBe(true);
      expect(expander.stack.map(({ instanceId }) => instanceId)).toEqual([
        fixtureInstanceId("own-source-bagramon-expander-1-card"),
      ]);
      expect(bagramon.stack.map(({ instanceId }) => instanceId).sort()).toEqual([...materials].sort());
      expect(s.state.memory).toBe(-7);
      answer({ kind: "optional", accept: true });
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      const sourceDecision = s.state.pendingDecision!.decisionId;
      answer({ kind: "chooseTargets", instanceIds: [victim.permanentId] });
      await settle(
        () => s.state.pendingDecision !== undefined && s.state.pendingDecision.decisionId !== sourceDecision,
      );
      expect(s.state.pendingDecision!.kind).toBe("chooseTargets");
      expect(JSON.parse(s.state.pendingDecision!.payloadJson).candidateInstanceIds.sort()).toEqual(
        opponent.battleArea
          .filter((p) => p !== victim)
          .map(({ permanentId }) => permanentId)
          .sort(),
      );
      answer({ kind: "chooseTargets", instanceIds: [host.permanentId] });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([victimTop, ...existing]);
      expect(opponent.trash.map(({ instanceId }) => instanceId)).toEqual(shed);
      expect(s.decisions.at(-1)!.req.options?.timing).toBe("AllTurns");
      answer({ kind: "optional", accept: acceptCost });
      await settle(
        () => s.state.pendingDecision === undefined && s.state.turnSeat === 1 && s.state.phase === Phase.Breeding,
      );
      expect(bagramon.stack.map(({ instanceId }) => instanceId).sort()).toEqual(
        acceptCost ? [] : [...materials].sort(),
      );
      expect(human.trash.map(({ instanceId }) => instanceId).sort()).toEqual(acceptCost ? [...materials].sort() : []);
      expect(opponent.security).toHaveLength(acceptCost ? 4 : 5);
      expect(expander.isSuspended).toBe(true);
    } finally {
      if (s.state.phase === Phase.Breeding) {
        s.engine.applyIntent(s.state.turnSeat as 0 | 1, { type: "endPhase" });
        await advance(s.engine).waitForMainPhase(s.state.turnSeat as 0 | 1);
      }
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
