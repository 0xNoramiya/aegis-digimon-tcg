import fixtureEx12MetalgreymonForcedAttackPlay from "./ex12-metalgreymon-forced-attack-play.fixture.js";
import fixtureEx12MetalgreymonForcedAttackDigivolve from "./ex12-metalgreymon-forced-attack-digivolve.fixture.js";

import { fixtureVariant, fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const RECIPIENT = fixturePermanentId("opponent-metalgreymon-recipient");
const OTHER = fixturePermanentId("opponent-metalgreymon-other");
const DELETED = fixturePermanentId("opponent-metalgreymon-delete");

describe("EX12 MetalGreymon arena", () => {
  it.each(["play", "digivolve"] as const)(
    "%s grants a mandatory attack to the surviving opponent through the real turn loop",
    async (mode) => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
      layScenarioFixture(
        s.state,
        fixtureVariant(
          { play: fixtureEx12MetalgreymonForcedAttackPlay, digivolve: fixtureEx12MetalgreymonForcedAttackDigivolve },
          mode,
        ),
        [BLUE_DECK, RED_DECK],
        true,
      );
      const recipient = s.state.players[1]!.battleArea.find((p) => p.permanentId === RECIPIENT)!;
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(
          s.engine.applyIntent(
            0,
            mode === "play"
              ? { type: "playCard", instanceId: fixtureInstanceId("metalgreymon-hand-card") }
              : {
                  type: "digivolve",
                  instanceId: fixtureInstanceId("metalgreymon-hand-card"),
                  permanentId: fixturePermanentId("own-metalgreymon-base"),
                  useAlternateCost: true,
                },
          ),
        ).toEqual({ ok: true });
        await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
        const grant = s.decisions.at(-1)!;
        expect(grant.seat).toBe(0);
        expect(grant.req.options).toMatchObject({ candidateInstanceIds: [RECIPIENT, OTHER], min: 1, max: 1 });
        expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === DELETED)).toBe(false);
        expect(
          s.engine.applyIntent(1, {
            type: "respondDecision",
            decisionId: grant.req.decisionId,
            response: { kind: "chooseTargets", instanceIds: [RECIPIENT] },
          }).ok,
        ).toBe(false);
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: grant.req.decisionId,
            response: { kind: "chooseTargets", instanceIds: [RECIPIENT] },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.state.pendingDecision === undefined);
        expect(s.state.memory).toBe(mode === "play" ? 3 : 7);
        expect(recipient.attacksAtStartOfMainPhase).toBe(true);
        expect(recipient.grantedEffectTexts.join(" ")).toContain("[Start of Your Main Phase]");
        expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(0);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
        expect(recipient.attacksAtStartOfMainPhase).toBe(true);
        expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(0);
        expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(1);
        const attack = s.decisions.at(-1)!;
        expect(attack.seat).toBe(1);
        expect(attack.req).toMatchObject({ kind: "selectCards", sourcePermanentId: RECIPIENT });
        expect(attack.req.options).toMatchObject({
          min: 1,
          max: 1,
          candidateInstanceIds: ["player"],
          timing: "[Start of Your Main Phase]",
        });
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: attack.req.decisionId,
            response: { kind: "selectCards", instanceIds: ["player"] },
          }).ok,
        ).toBe(false);
        expect(
          s.engine.applyIntent(1, {
            type: "respondDecision",
            decisionId: attack.req.decisionId,
            response: { kind: "selectCards", instanceIds: [] },
          }).ok,
        ).toBe(false);
        expect(s.engine.applyIntent(1, { type: "endPhase" }).ok).toBe(false);
        expect(
          s.engine.applyIntent(1, {
            type: "respondDecision",
            decisionId: attack.req.decisionId,
            response: { kind: "selectCards", instanceIds: ["player"] },
          }),
        ).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(1);
        expect(recipient.isSuspended).toBe(true);
        expect(s.events.filter((e) => e.kind === "attackDeclared")).toEqual([
          expect.objectContaining({ seat: 1, attackerPermanentId: RECIPIENT, target: { kind: "player" } }),
        ]);
        expect(s.state.players[0]!.security.length).toBeLessThan(5);
        expect(s.state.players[1]!.battleArea).toContain(recipient);
        expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
        await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
        expect(recipient.attacksAtStartOfMainPhase).toBe(false);
        expect(recipient.grantedEffectTexts).toHaveLength(0);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
        expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(1);
        expect(recipient.isSuspended).toBe(false);
        expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(1);
      } finally {
        s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
        await loop;
      }
    },
  );
});
