import prepared0 from "./davis-ken-end-turn.fixture.js";
import { fixtureVariant, fixtureInstanceId } from "../scenario/references.js";

const preparedFixtures = { "davis-ken-end-turn": prepared0 };

import { Phase, type DecisionResponse, type Intent, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const TAMER = "EX13-070";

function board(eligible = true, historicalMaterials = false) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: TAMER, as: "tamer" },
          { card: historicalMaterials ? "BT21-037" : "BT12-022", as: "blue" },
          { card: historicalMaterials ? "ST9-09" : "BT12-050", as: "green" },
        ],
        hand: [
          ...(eligible
            ? [
                { card: "BT16-025", as: "paildramon" },
                { card: "AD1-024", as: "fighter" },
              ]
            : []),
          { card: "EX13-076", as: "paladin" },
          { card: "ST2-02", as: "payment2" },
          { card: historicalMaterials ? "BT16-085" : "ST2-05", as: "payment4" },
        ],
        eggDeck: ["BT1-001"],
        deck: Array(12).fill("ST2-02"),
        security: Array(5).fill("ST2-02"),
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "opponent" }],
        eggDeck: ["BT1-001"],
        deck: Array(12).fill("ST2-16"),
        security: Array(5).fill("ST2-02"),
      },
    },
    { autoSelectCards: true },
  );
  s.state.turnCount = 5;
  s.state.isFirstPlayersFirstTurn = false;
  s.state.memory = 3;
  return s;
}

type Setup = ReturnType<typeof board>;

function apply(s: Setup, seat: Seat, intent: Intent) {
  expect(s.engine.applyIntent(seat, intent)).toEqual({ ok: true });
}

async function main(s: Setup, seat: Seat, turn: number) {
  await settle(() => s.state.turnSeat === seat && s.state.turnCount === turn && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(seat);
}

async function answer(s: Setup, response: DecisionResponse, sourceCardId = TAMER) {
  await settle(() => s.state.pendingDecision?.kind === response.kind);
  const decision = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
  expect(decision.sourceCardId).toBe(sourceCardId);
  expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: decision.decisionId, response })).toEqual({
    ok: true,
  });
  return decision;
}

async function passOpponent(s: Setup, turn: number) {
  await main(s, 1, turn);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await main(s, 0, turn + 1);
  expect(s.perm("tamer").isSuspended).toBe(false);
  expect(s.state.memory).toBe(3);
}

async function declineDnaPayload(s: Setup) {
  const cost = await answer(s, { kind: "optional", accept: true });
  expect(cost.promptText).toMatch(/suspending this Tamer/);
  await answer(s, { kind: "chooseOption", optionIndex: 1 });
  const payload = await answer(s, { kind: "optional", accept: false });
  expect(payload.promptText).toBe("DNA digivolve");
  expect(s.perm("tamer").isSuspended).toBe(true);
  expect(s.perm("blue").topCard.instanceId).toBe(s.inst("blue").instanceId);
  expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("paildramon").instanceId)).toBe(true);
}

async function dnaInMain(s: Setup, expectedMemory = 5) {
  const blue = s.inst("blue").instanceId;
  const green = s.inst("green").instanceId;
  const paildramon = s.inst("paildramon").instanceId;
  expect(
    s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      instanceId: paildramon,
      materialPermanentIds: [s.perm("blue").permanentId, s.perm("green").permanentId],
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === paildramon) &&
      s.engine.inputSeat === 0 &&
      !s.state.pendingDecision,
  );
  const result = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === paildramon)!;
  expect(result.stack.map((c) => c.instanceId)).toEqual([green, blue]);
  expect(result.isSuspended).toBe(false);
  expect(s.state.memory).toBe(expectedMemory); // BT12 materials each gain one; the historical pair does not.
  return result;
}

describe("Feedback #88: EX13-070 End of Your Turn rearming", () => {
  it("offers after the historical material pair's DNA and BT16-085's exact 3 to -1 play on turn 10", async () => {
    const s = board(true, true);
    const loop = s.engine.startTurnLoop();
    try {
      await main(s, 0, 6);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await answer(s, { kind: "optional", accept: false });
      await passOpponent(s, 7);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await declineDnaPayload(s);
      await passOpponent(s, 9);
      const result = await dnaInMain(s, 3);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("payment4").instanceId })).toEqual({
        ok: true,
      });
      const cost = await answer(s, { kind: "optional", accept: true });
      expect(cost.sourceInstanceId).toBe(s.inst("tamer").instanceId);
      expect(s.state.memory).toBe(-1);
      await answer(s, { kind: "optional", accept: true });
      // Both the result's optional response and the newly played BT16 Tamer's
      // memory response are refused; neither may obscure the EX13 Tamer's offer.
      for (let response = 0; response < 4; response++) {
        await settle(
          () =>
            s.state.pendingDecision?.kind === "optional" ||
            (s.state.turnCount === 11 && s.state.phase === Phase.Breeding),
        );
        if (s.state.turnCount === 11) break;
        const current = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
        expect(["AD1-024", "BT16-085"]).toContain(current.sourceCardId);
        await answer(s, { kind: "optional", accept: false }, current.sourceCardId);
      }
      await main(s, 1, 11);
      expect(result.topCard.instanceId).toBe(s.inst("fighter").instanceId);
      expect(result.stack.map((c) => c.instanceId)).toEqual([
        s.inst("green").instanceId,
        s.inst("blue").instanceId,
        s.inst("paildramon").instanceId,
      ]);
      expect(s.perm("tamer").isSuspended).toBe(true);
      expect(s.perm("payment4").isSuspended).toBe(false);
      expect(s.decisions.some(({ req }) => req.sourceCardId === "BT16-085" && req.kind === "optional")).toBe(true);
      expect(s.state.memory).toBe(5);
      expect(s.events.filter((e) => e.kind === "actionRejected")).toEqual([]);
    } finally {
      s.engine.expireMatchTimer(s.state.turnSeat);
      await loop;
    }
  });

  it("runs the registered arena through three own turns with public cost refusals", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(s.state, fixtureVariant(preparedFixtures, "davis-ken-end-turn"));
    const tamer = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === TAMER)!;
    const loop = s.engine.startTurnLoop();
    try {
      for (const turn of [6, 8, 10]) {
        await main(s, 0, turn);
        expect(tamer.topCard.instanceId).toBe(fixtureInstanceId("dev-field-0-feedback88-tamer"));
        expect(tamer.isSuspended).toBe(false);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        const cost = await answer(s, { kind: "optional", accept: false });
        expect(cost.sourcePermanentId).toBe(tamer.permanentId);
        await main(s, 1, turn + 1);
        expect(s.state.memory).toBe(3);
        expect(tamer.isSuspended).toBe(false);
        if (turn !== 10) apply(s, 1, { type: "endPhase" });
      }
      expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([
        fixtureInstanceId("feedback88-paildramon"),
        fixtureInstanceId("feedback88-fighter"),
        fixtureInstanceId("feedback88-paladin"),
        fixtureInstanceId("feedback88-payment2"),
        fixtureInstanceId("feedback88-payment4"),
        fixtureInstanceId("feedback88-deck-0-0"),
        fixtureInstanceId("feedback88-deck-0-1"),
        fixtureInstanceId("feedback88-deck-0-2"),
      ]);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.events.filter((e) => e.kind === "actionRejected")).toEqual([]);
    } finally {
      s.engine.expireMatchTimer(s.state.turnSeat);
      await loop;
    }
  });

  it("pays a suspension with no eligible evolution but never offers an illegal payload", async () => {
    const s = board(false);
    const loop = s.engine.startTurnLoop();
    try {
      await main(s, 0, 6);
      const handBefore = s.state.players[0]!.hand.map((c) => c.instanceId);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("blue").permanentId,
          instanceId: s.inst("paladin").instanceId,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect(s.state.memory).toBe(3);
      expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual(handBefore);
      expect(s.perm("blue").stack).toHaveLength(0);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await answer(s, { kind: "optional", accept: true });
      await main(s, 1, 7);
      expect(s.perm("tamer").isSuspended).toBe(true);
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual([TAMER, "BT12-022", "BT12-050"]);
      expect(s.decisions.filter(({ req }) => req.sourceCardId === TAMER).map(({ req }) => req.kind)).toEqual([
        "optional",
      ]);
      expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("paladin").instanceId)).toBe(true);
      expect(s.state.memory).toBe(3);
      expect(s.events.filter((e) => e.kind === "digivolved")).toEqual([]);
    } finally {
      s.engine.expireMatchTimer(s.state.turnSeat);
      await loop;
    }
  });

  it("DNA memory regain resumes Main, refuses the now-suspended Tamer, then rearms next own turn", async () => {
    const s = board();
    const loop = s.engine.startTurnLoop();
    try {
      await main(s, 0, 6);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("payment4").instanceId })).toEqual({
        ok: true,
      });
      await answer(s, { kind: "optional", accept: true });
      expect(s.state.memory).toBe(-1);
      await answer(s, { kind: "chooseOption", optionIndex: 1 });
      await answer(s, { kind: "optional", accept: true });
      await settle(() => s.state.memory === 1 && !s.state.pendingDecision);
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.engine.inputSeat === 0);
      expect(s.state.turnCount).toBe(6);
      expect(s.perm("tamer").isSuspended).toBe(true);
      expect(s.events.some((e) => e.kind === "turnEnded")).toBe(false);
      const result = s.state.players[0]!.battleArea.find(
        (p) => p.topCard.instanceId === s.inst("paildramon").instanceId,
      )!;
      expect(result.stack.map((c) => c.instanceId)).toEqual([s.inst("green").instanceId, s.inst("blue").instanceId]);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("payment2").instanceId })).toEqual({
        ok: true,
      });
      await main(s, 1, 7);
      expect(s.state.memory).toBe(1);
      expect(
        s.decisions.filter(({ req }) => req.sourceCardId === TAMER && /suspending this Tamer/.test(req.promptText)),
      ).toHaveLength(1);
      // Paildramon left the opponent suspended, and the blue Option has no color
      // source. Its Main may therefore have passed automatically on entry.
      advance(s.engine).endMainPhaseIfOpen(1);
      await main(s, 0, 8);
      expect(s.perm("tamer").isSuspended).toBe(false);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await answer(s, { kind: "optional", accept: false });
      await main(s, 1, 9);
      expect(
        s.decisions.filter(({ req }) => req.sourceCardId === TAMER && /suspending this Tamer/.test(req.promptText)),
      ).toHaveLength(2);
      expect(s.events.filter((e) => e.kind === "actionRejected")).toEqual([]);
    } finally {
      s.engine.expireMatchTimer(s.state.turnSeat);
      await loop;
    }
  });

  it.each(["cost crossing", "explicit pass"] as const)(
    "offers again on turn 10 after turn 6 refusal and turn 8 paid/declined DNA (%s)",
    async (ending) => {
      const s = board();
      const tamerInstance = s.inst("tamer").instanceId;
      const loop = s.engine.startTurnLoop();
      try {
        await main(s, 0, 6);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await answer(s, { kind: "optional", accept: false });
        expect(s.perm("tamer").isSuspended).toBe(false);
        await passOpponent(s, 7);

        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await declineDnaPayload(s);
        await passOpponent(s, 9);
        const result = await dnaInMain(s);

        const eventsBeforeEnd = s.events.length;
        if (ending === "cost crossing") {
          apply(s, 0, { type: "playCard", instanceId: s.inst("payment2").instanceId });
          await settle(() => s.state.memory === 3 && s.engine.inputSeat === 0 && !s.state.pendingDecision);
          apply(s, 0, { type: "playCard", instanceId: s.inst("payment4").instanceId });
        } else apply(s, 0, { type: "endPhase" });
        const cost = await answer(s, { kind: "optional", accept: true });
        expect(cost.sourceInstanceId).toBe(tamerInstance);
        expect(s.state.turnCount).toBe(10);
        expect(s.state.turnSeat).toBe(0);
        expect(s.state.memory).toBe(ending === "cost crossing" ? -1 : -3);
        await answer(s, { kind: "optional", accept: true });
        // Single legal targets are selected by the normal test player. Paladin has
        // the required name/trait but cannot evolve from this level 5.
        await settle(
          () =>
            s.decisions.some(
              ({ req }) => req.decisionId === s.state.pendingDecision?.decisionId && req.sourceCardId === "AD1-024",
            ) ||
            (s.state.turnSeat === 1 && s.state.phase === Phase.Breeding),
        );
        if (s.state.pendingDecision) await answer(s, { kind: "optional", accept: false }, "AD1-024");
        await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && !s.state.pendingDecision);

        expect(result.topCard.instanceId).toBe(s.inst("fighter").instanceId);
        expect(result.stack.map((c) => c.instanceId)).toEqual([
          s.inst("green").instanceId,
          s.inst("blue").instanceId,
          s.inst("paildramon").instanceId,
        ]);
        expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("fighter").instanceId)).toBe(false);
        expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("paladin").instanceId)).toBe(true);
        expect(s.perm("tamer").isSuspended).toBe(true);
        expect(s.state.memory).toBe(ending === "cost crossing" ? 5 : 7);
        expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(s.inst("opponent").instanceId);
        expect(s.events.filter((e) => e.kind === "actionRejected")).toEqual([]);
        const ended = s.events.slice(eventsBeforeEnd);
        expect(ended.findIndex((e) => e.kind === "digivolved")).toBeLessThan(
          ended.findIndex((e) => e.kind === "turnEnded"),
        );
        expect(
          s.decisions.filter(({ req }) => req.sourceCardId === TAMER && /suspending this Tamer/.test(req.promptText)),
        ).toHaveLength(3);
      } finally {
        s.engine.expireMatchTimer(s.state.turnSeat);
        await loop;
      }
    },
  );
});
