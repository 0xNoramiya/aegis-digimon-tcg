import fixtureLarvaBt18Breeding from "./larva-bt18-breeding.fixture.js";
import fixtureLarvaEx10Breeding from "./larva-ex10-breeding.fixture.js";
import fixtureGreymonSecurityDestination from "./greymon-security-destination.fixture.js";
import { fixtureVariant, fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

async function declineEx10Attack(s: EngineSetup): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "optional");
  const decision = s.decisions.at(-1)!;
  expect(decision.seat).toBe(1);
  expect(decision.req.sourceCardId).toBe("EX10-060");
  expect(
    s.engine.applyIntent(1, {
      type: "respondDecision",
      decisionId: decision.req.decisionId,
      response: { kind: "optional", accept: false },
    }),
  ).toEqual({ ok: true });
}

function assertSecurityPlacement(s: EngineSetup): void {
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.state.players[1]!.security.at(-1)?.cardId).toBe("BT1-015");
  expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT9-109");
  expect(s.state.players[1]!.deck.some((card) => card.cardId === "BT9-109")).toBe(false);
  expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT11-064")).toBe(false);
}

async function assertHandProtectionAndSpentCost(s: EngineSetup): Promise<void> {
  expect(s.state.players[1]!.battleArea).toHaveLength(1);
  expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT9-109");
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("option-2-card") })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === fixtureInstanceId("option-2-card")));
  // Gaia Force crosses memory after the paid hand-return prevention. Complete
  // the resulting opponent breeding window before asserting the settled board.
  await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-015");
  expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT11-064")).toHaveLength(1);
}

describe("playable leave-prevention arenas", () => {
  for (const variant of ["bt18", "ex10"] as const) {
    it.each([true, false])(`${variant}: real turn loop honors Larva acceptance %s in breeding`, async (accept) => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true });
      layScenarioFixture(
        s.state,
        fixtureVariant({ bt18: fixtureLarvaBt18Breeding, ex10: fixtureLarvaEx10Breeding }, variant),
        [BLUE_DECK, RED_DECK],
        true,
      );
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: fixturePermanentId("own-satan"),
            target: { kind: "permanent", permanentId: fixturePermanentId("opponent-defender") },
          }),
        ).toEqual({ ok: true });
        if (variant === "ex10") await declineEx10Attack(s);
        await settle(
          () => s.state.pendingDecision?.kind === "optional" && s.decisions.at(-1)?.req.sourceCardId === "BT18-086",
        );
        const decision = s.decisions.at(-1)!;
        expect(decision.seat).toBe(0);
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: decision.req.decisionId,
            response: { kind: "optional", accept },
          }),
        ).toEqual({ ok: true });
        await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
        expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === fixturePermanentId("own-satan"))).toBe(
          accept,
        );
        expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT18-086")).toBe(accept);
        expect(s.state.players[0]!.breeding?.topCard.cardId).toBe(accept ? undefined : "BT18-086");
        expect(s.state.players[1]!.battleArea).toHaveLength(0);
        expect(s.state.phase).toBe(Phase.Main);
        expect(s.state.pendingDecision).toBeUndefined();
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    });
  }

  it.each(["security", "hand"] as const)(
    "real turn loop distinguishes %s and preserves the printed payment",
    async (destination) => {
      const s = setupEngine(
        { 0: {}, 1: {} },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
      );
      layScenarioFixture(s.state, fixtureGreymonSecurityDestination, [BLUE_DECK, RED_DECK], true);
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        const optionId =
          destination === "security" ? fixtureInstanceId("option-0-card") : fixtureInstanceId("option-1-card");
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[0]!.trash.some((card) => card.instanceId === optionId) &&
            s.state.pendingDecision === undefined,
        );
        if (destination === "security") assertSecurityPlacement(s);
        else await assertHandProtectionAndSpentCost(s);
        expect(s.state.pendingDecision).toBeUndefined();
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );
});
