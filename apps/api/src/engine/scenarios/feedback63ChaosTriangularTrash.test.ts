import { Phase, type DecisionResponse } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { RED_DECK, BLUE_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

async function resolvePrintedDecisions(
  s: ReturnType<typeof setupEngine>,
  accepted: boolean,
  chaos: string,
  gundra: string,
  base: string,
  recipient: string,
): Promise<number> {
  let copiedTargetChoices = 0;
  for (let step = 0; step < 20; step++) {
    await settle(() => !!s.state.pendingDecision || s.engine.mainVerbContinuationsInFlight === 0);
    const pending = s.state.pendingDecision;
    if (!pending) return copiedTargetChoices;
    const request = s.decisions.find((d) => d.req.decisionId === pending.decisionId)!.req;
    let response: DecisionResponse;
    if (request.kind === "optional") {
      response = { kind: "optional", accept: request.sourceCardId !== "EX7-048" || accepted };
    } else if (request.kind === "selectCards" || request.kind === "chooseTargets") {
      const candidates = request.options!.candidateInstanceIds ?? [];
      const preference = request.sourceCardId === "EX7-066" ? [recipient] : ["opponent", chaos, gundra, base];
      const selected = preference.find((id) => candidates.includes(id)) ?? candidates[0]!;
      if (request.sourceCardId === "EX7-066") copiedTargetChoices++;
      response = { kind: request.kind, instanceIds: [selected] };
    } else throw new Error(`Unexpected public decision: ${request.kind}`);
    expect(
      s.engine.applyIntent(request.seat, { type: "respondDecision", decisionId: request.decisionId, response }),
    ).toEqual({ ok: true });
  }
  throw new Error("Printed decisions did not settle");
}

it.each([false, true])(
  "Feedback #63: delayed discard bonus chooses %s additional recipient after both replacements",
  async (additional) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-036", as: "kent" }, "BT1-009"],
          battleArea: [{ card: "EX13-032", as: "base", under: ["EX13-004", "EX13-026"] }],
          security: ["BT1-009"],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            {
              card: "EX7-048",
              as: "gundra",
              under: [
                "EX7-070",
                { card: "EX7-066", as: "chaos" },
                "EX7-005",
                "EX7-008",
                "EX7-010",
                "EX7-044",
                { card: "EX7-066", as: "duplicate" },
              ],
            },
            ...(additional ? [{ card: "BT1-009", as: "recipient", dp: 10000 }] : []),
          ],
          security: ["BT1-009"],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoOrderCards: true },
    );
    const sources = s.perm("gundra").stack.map((c) => c.instanceId);
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kent").instanceId,
      }),
    ).toEqual({ ok: true });
    const targetChoices = await resolvePrintedDecisions(
      s,
      true,
      s.inst("chaos").instanceId,
      s.perm("gundra").permanentId,
      s.perm("base").permanentId,
      additional ? s.perm("recipient").permanentId : s.perm("gundra").permanentId,
    );
    expect(targetChoices).toBe(Number(additional));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toContain(s.inst("chaos").instanceId);
    expect(s.perm("gundra").stack.map((c) => c.instanceId)).toEqual(
      sources.filter((id) => id !== s.inst("chaos").instanceId),
    );
    expect(s.perm("gundra").currentDP).toBe(additional ? 5000 : 8000);
    const recipientDP = additional ? s.perm("recipient").currentDP : s.perm("gundra").currentDP;
    expect(recipientDP).toBe(additional ? 6000 : 8000);
    expect(s.perm("base").topCard.cardId).toBe("EX13-032");
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("kent").instanceId);
    const parentResolved = s.events.findIndex(
      (e) => e.kind === "effectResolved" && e.sourceCardId === "EX13-036" && e.effectKey.includes("place-one-each"),
    );
    const discarded = s.events.findIndex(
      (e) => e.kind === "effectTriggered" && e.sourceInstanceId === s.inst("chaos").instanceId,
    );
    expect(parentResolved).toBeGreaterThanOrEqual(0);
    expect(discarded).toBeGreaterThan(parentResolved);
    expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "EX7-066")).toHaveLength(1);
    assertNoLoudGap(s);
  },
);

it.each([false, true])(
  "Feedback #63: real arena protection accepted=%s and off-turn bonus expires on opponent's end",
  async (accepted) => {
    const s = setupEngine({ autoOrderCards: true });
    layDevScenario("arena-feedback63-chaos-triangular-trash", s.state, [RED_DECK, BLUE_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const other = s.state.players[1]!;
      const base = human.battleArea[0]!;
      const gundra = other.battleArea[0]!;
      const initialSources = gundra.stack.map((c) => c.instanceId);
      const deck = human.deck.length;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: base.permanentId,
          instanceId: "feedback63-kentauros",
        }),
      ).toEqual({ ok: true });
      expect(
        await resolvePrintedDecisions(
          s,
          accepted,
          "feedback63-chaos",
          gundra.permanentId,
          base.permanentId,
          gundra.permanentId,
        ),
      ).toBe(0);
      expect(s.state.memory).toBe(3);
      expect(human.deck).toHaveLength(deck - 1);
      expect(base.topCard.instanceId).toBe("dev-field-0-feedback63-base");
      expect(human.security.map((c) => c.instanceId)).toEqual(["feedback63-kentauros", "feedback63-own-security"]);
      expect(other.trash.map((c) => c.instanceId)).toEqual(
        accepted
          ? ["feedback63-opponent-security", "feedback63-chaos"]
          : ["feedback63-opponent-security", ...initialSources],
      );
      expect(other.security.map((c) => c.instanceId)).toEqual(accepted ? [] : [gundra.topCard.instanceId]);
      expect(other.battleArea.map((p) => p.permanentId)).toEqual(accepted ? [gundra.permanentId] : []);
      expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "EX7-066")).toHaveLength(
        Number(accepted),
      );
      // This source owner is acting during its opponent's current turn.
      const survivor = other.battleArea.find((p) => p.permanentId === gundra.permanentId);
      expect(survivor?.currentDP).toBe(accepted ? 8000 : undefined);
      expect(survivor?.stack.map((c) => c.instanceId)).toEqual(
        accepted ? initialSources.filter((id) => id !== "feedback63-chaos") : undefined,
      );
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(other.battleArea.find((p) => p.permanentId === gundra.permanentId)?.currentDP).toBe(
        accepted ? 16000 : undefined,
      );
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);

it("Feedback #63: public Sparrowmon source placement remains eligible when paid as delayed protection", async () => {
  const preferred: string[] = ["opponent"];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX13-032", as: "base", under: ["EX13-004", "EX13-026"] }],
        hand: [{ card: "EX13-036", as: "kent" }, "BT1-009"],
        security: ["BT1-009"],
        deck: Array(10).fill("BT1-009"),
      },
      1: {
        battleArea: [
          { card: "EX7-048", as: "gundra", under: ["EX7-005", "EX7-008", "EX7-010", "EX7-044"] },
          { card: "EX7-051", as: "sparrow" },
        ],
        hand: [{ card: "EX7-066", as: "chaos" }, "BT1-009"],
        security: ["BT1-009"],
        deck: Array(10).fill("BT1-009"),
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
  );
  preferred.push(s.inst("chaos").instanceId, s.perm("gundra").permanentId);
  s.state.turnSeat = 1;
  s.state.memory = 6;
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("gundra").stack[0]!.instanceId).toBe(s.inst("chaos").instanceId);
    expect(s.inst("chaos").faceUp).toBe(true);
    expect(s.state.players[1]!.hand.some((c) => c.instanceId === s.inst("chaos").instanceId)).toBe(false);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kent").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
    expect(s.perm("gundra").currentDP).toBe(8000);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toContain(s.inst("chaos").instanceId);
    expect(s.perm("gundra").stack.some((c) => c.instanceId === s.inst("chaos").instanceId)).toBe(false);
    const placed = s.events.findIndex(
      (e) => e.kind === "cardsMoved" && e.instanceIds.includes(s.inst("chaos").instanceId) && e.to === "battleArea",
    );
    const triggered = s.events.findIndex(
      (e) => e.kind === "effectTriggered" && e.sourceInstanceId === s.inst("chaos").instanceId,
    );
    expect(placed).toBeGreaterThanOrEqual(0);
    expect(triggered).toBeGreaterThan(placed);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
