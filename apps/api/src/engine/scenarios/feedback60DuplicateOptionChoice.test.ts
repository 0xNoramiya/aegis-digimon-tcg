import { Phase, type DecisionResponse } from "@aegis/shared";
import { layDevScenario } from "../devScenario.js";
import { RED_DECK, BLUE_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { pendingEffectCandidates } from "../gameEngine/pendingEffectCandidates.js";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { setupEngine, settle, assertNoLoudGap, type EngineSetup } from "../testkit/harness.js";

it.each(["old", "pending", "refuse"] as const)(
  "Feedback #60 (%s): marks only the pending physical source in a nested duplicate Option choice",
  async (selection) => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT25-083", as: "lady" }, "BT1-009"],
        battleArea: [{ card: "BT25-082", as: "base", under: [{ card: "EX7-071", as: "pending" }] }],
        trash: [
          { card: "EX7-071", as: "old" },
          { card: "BT25-085", as: "dual" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim" }], deck: ["BT1-009", "BT1-010"] },
    });
    s.state.memory = 10;
    await s.ready();
    const pending = s.inst("pending").instanceId;
    const old = s.inst("old").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lady").instanceId,
      }),
    ).toEqual({ ok: true });
    try {
      await resolveNested(s, pending, old, s.inst("dual").instanceId, s.perm("base").permanentId, selection);

      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      expect(s.state.memory).toBe(selection === "pending" ? 4 : 5);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.perm("base").stack.map((c) => c.instanceId)).toEqual(
        selection === "refuse"
          ? [s.inst("base").instanceId]
          : [selection === "old" ? old : pending, s.inst("base").instanceId],
      );
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual(
        selection === "refuse"
          ? [old, pending, s.inst("dual").instanceId]
          : [selection === "old" ? pending : old, s.inst("dual").instanceId],
      );
      expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceInstanceId === pending)).toHaveLength(
        selection === "pending" ? 0 : 1,
      );
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  },
);

// The fixed scenario emits several decision types; assertions apply only to its exact duplicate-card request.
/* eslint-disable vitest/no-conditional-expect */
async function resolveNested(
  s: EngineSetup,
  pending: string,
  old: string,
  dual: string,
  base: string,
  selection: "old" | "pending" | "refuse",
) {
  let duplicateChoice = false;
  for (let step = 0; step < 20; step++) {
    await settle(() => !!s.state.pendingDecision || s.engine.mainVerbContinuationsInFlight === 0);
    if (!s.state.pendingDecision) break;
    const req = s.decisions.at(-1)!.req;
    const candidates = req.options?.candidateInstanceIds ?? [];
    let response: DecisionResponse;
    if (req.kind === "optional") {
      response = {
        kind: "optional",
        accept: !req.promptText.includes("By placing") && !req.promptText.includes("Arts"),
      };
    } else if (req.kind === "selectCards" || req.kind === "chooseTargets") {
      if (candidates.includes(pending) && candidates.includes(old) && req.sourceCardId === "BT25-085") {
        duplicateChoice = true;
        // A visible identity does not authorize a card outside this offered choice.
        const before = s.state.players[0]!.trash.map((card) => card.instanceId);
        expect(
          s.engine.applyIntent(req.seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: req.kind, instanceIds: ["not-offered"] },
          }).ok,
        ).toBe(false);
        expect(s.state.pendingDecision?.decisionId).toBe(req.decisionId);
        expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(before);
        expect(req.options).toMatchObject({ pendingEffectInstanceIds: [pending] });
        expect(JSON.parse(s.state.pendingDecision.payloadJson)).toEqual(req.options);
      }
      const pick = req.sourceCardId === "BT25-085" ? [old, base] : [dual, pending];
      const duplicate = candidates.includes(pending) && candidates.includes(old) && req.sourceCardId === "BT25-085";
      response = {
        kind: req.kind,
        instanceIds: req.promptText.includes("Arts Digivolve")
          ? []
          : duplicate
            ? selection === "refuse"
              ? []
              : [selection === "old" ? old : pending]
            : [pick.find((id) => candidates.includes(id)) ?? candidates[0]!],
      };
    } else if (req.kind === "chooseOption") response = { kind: "chooseOption", optionIndex: 0 };
    else throw new Error(`Unexpected decision ${req.kind}`);
    expect(s.engine.applyIntent(req.seat, { type: "respondDecision", decisionId: req.decisionId, response })).toEqual({
      ok: true,
    });
  }
  expect(duplicateChoice).toBe(true);
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(
    pendingEffectCandidates(s.engine, {
      seat: 0,
      kind: "selectCards",
      promptText: "After resolution",
      options: { candidateInstanceIds: [old, pending] },
    }),
  ).toEqual([]);
}

/* eslint-enable vitest/no-conditional-expect */

it.each(["old", "pending", "refuse"] as const)(
  "Feedback #60 real-turn arena: %s choice and exact accounting",
  async (selection) => {
    const s = setupEngine();
    layDevScenario("arena-feedback60-duplicate-option-choice", s.state, [RED_DECK, BLUE_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const base = human.battleArea[0]!;
      const security = human.security.map((card) => card.instanceId);
      const deck = human.deck.length;
      expect(
        s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: "feedback60-lady" }),
      ).toEqual({ ok: true });
      await resolveNested(s, "feedback60-pending", "feedback60-old", "feedback60-dual", base.permanentId, selection);
      expect(s.state.memory).toBe(selection === "pending" ? 4 : 5);
      expect(base.topCard?.instanceId).toBe("feedback60-lady");
      expect(base.stack.map((card) => card.instanceId)).toEqual(
        selection === "refuse"
          ? ["dev-field-0-feedback60-base"]
          : [selection === "old" ? "feedback60-old" : "feedback60-pending", "dev-field-0-feedback60-base"],
      );
      expect(human.hand.map((card) => card.instanceId)).toEqual([
        "feedback60-reserve",
        "feedback60-deck-0-0",
        "feedback60-deck-0-1",
      ]);
      expect(human.deck).toHaveLength(deck - 1);
      expect(human.security.map((card) => card.instanceId)).toEqual(security);
      expect(human.trash.map((card) => card.instanceId)).toEqual(
        selection === "refuse"
          ? ["feedback60-old", "feedback60-pending", "feedback60-dual"]
          : [selection === "old" ? "feedback60-pending" : "feedback60-old", "feedback60-dual"],
      );
      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(["dev-field-1-feedback60-victim"]);
      expect(
        s.events.filter(
          (event) =>
            event.kind === "memoryChanged" &&
            (event.reason === "payCost" || event.reason === "digivolve") &&
            event.from - event.to === 3,
        ),
      ).toHaveLength(2);
      const parent = s.events.findIndex(
        (event) =>
          event.kind === "effectResolved" &&
          event.sourceCardId === "BT25-083" &&
          event.effectKey?.includes("trash-source-use-option"),
      );
      const watcher = s.events.findIndex(
        (event) => event.kind === "effectTriggered" && event.sourceInstanceId === "feedback60-pending",
      );
      expect(parent).toBeGreaterThanOrEqual(0);
      expect(watcher > parent).toBe(selection !== "pending");
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.state.memory).toBe(3);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
