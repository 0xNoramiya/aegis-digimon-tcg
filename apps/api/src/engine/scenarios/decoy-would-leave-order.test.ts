import { describe, expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle, type EngineSetup } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/decoy-would-leave-order.fixture";
import "#api/cards/index";

const DECOY_HOLDER = "TOKEN-AthoRenePor-Token";
const ENDANGERED = "BT1-024";
const WOULD_LEAVE_SOURCE = "BT24-037";
const PLAYABLE_SOURCE = "BT1-014";
const BYSTANDER = "BT1-009";
const DECOY_CONFIRMATION = "＜Decoy＞: delete this Digimon to prevent the other Digimon's deletion?";
const DECOY_TARGET_CHOICE = "＜Decoy＞: choose 1 Digimon to protect from deletion";

function offeredOrder(s: EngineSetup) {
  const options = s.decisions.at(-1)?.req.options;
  return (options?.triggerKeys ?? []).map((key, index) => ({
    key,
    cardId: options?.triggerCardIds?.[index],
    description: options?.triggerDescriptions?.[index] ?? "",
  }));
}

async function startTurn() {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: false, autoOrderTriggers: false });
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

async function deleteEndangeredWithGaiaForce(s: EngineSetup) {
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("endangered").permanentId] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
}

async function waitForSeatOneSelection(s: EngineSetup) {
  await settle(() => s.state.pendingDecision?.kind === "selectCards" && s.state.pendingDecision.seat === 1);
}

function selectCards(s: EngineSetup, instanceIds: string[]) {
  expect(
    s.engine.applyIntent(1, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "selectCards", instanceIds },
    }),
  ).toEqual({ ok: true });
}

function chooseFirst(s: EngineSetup, cardId: string) {
  const key = offeredOrder(s).find((entry) => entry.cardId === cardId)!.key;
  expect(
    s.engine.applyIntent(1, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "orderTriggers", order: [key] },
    }),
  ).toEqual({ ok: true });
}

function pendingPromptText(s: EngineSetup) {
  return s.state.pendingDecision?.promptText;
}

function pendingCandidates(s: EngineSetup) {
  return s.decisions.at(-1)?.req.options?.candidateInstanceIds ?? [];
}

function fieldCardIds(s: EngineSetup) {
  return s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId);
}

function decoyPreventions(s: EngineSetup) {
  return s.events.filter((event) => event.kind === "deletionPrevented" && event.keyword === "Decoy");
}

function promptCount(s: EngineSetup, promptText: string) {
  return s.decisions.filter(({ req }) => req.promptText === promptText).length;
}

async function settleBackToTurnPlayer(s: EngineSetup) {
  await settle(() => s.state.pendingDecision === undefined || s.state.pendingDecision.seat === 0);
}

describe("＜Decoy＞ and a would-leave effect on the same deletion", () => {
  it("offers ＜Decoy＞ in the same order choice as the would-leave effect", async () => {
    const { s, loop } = await startTurn();
    try {
      await deleteEndangeredWithGaiaForce(s);
      expect(s.state.pendingDecision).toMatchObject({ kind: "orderTriggers", seat: 1 });
      const offered = offeredOrder(s);
      expect(offered.map(({ cardId }) => cardId).sort()).toEqual([DECOY_HOLDER, WOULD_LEAVE_SOURCE].sort());
      expect(offered.find(({ cardId }) => cardId === DECOY_HOLDER)?.description).toMatch(/^＜Decoy＞/);
      expect(promptCount(s, DECOY_CONFIRMATION)).toBe(0);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("saves the Digimon with ＜Decoy＞ first and still resolves its would-leave effect", async () => {
    const { s, loop } = await startTurn();
    try {
      const holderId = s.perm("decoyHolder").permanentId;
      await deleteEndangeredWithGaiaForce(s);
      chooseFirst(s, DECOY_HOLDER);
      await waitForSeatOneSelection(s);
      expect(pendingPromptText(s)).toBe(DECOY_CONFIRMATION);
      expect(fieldCardIds(s)).not.toContain(PLAYABLE_SOURCE);
      selectCards(s, [s.inst("decoyHolder").instanceId]);
      await settleBackToTurnPlayer(s);

      expect(promptCount(s, DECOY_TARGET_CHOICE)).toBe(0);
      expect(fieldCardIds(s)).toEqual([ENDANGERED, BYSTANDER, BYSTANDER, PLAYABLE_SOURCE]);
      expect(decoyPreventions(s)).toMatchObject([
        {
          permanentId: s.perm("endangered").permanentId,
          paidPermanentId: holderId,
          paidCardId: DECOY_HOLDER,
        },
      ]);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("still offers ＜Decoy＞ after the would-leave effect resolves first", async () => {
    const { s, loop } = await startTurn();
    try {
      await deleteEndangeredWithGaiaForce(s);
      chooseFirst(s, WOULD_LEAVE_SOURCE);
      await waitForSeatOneSelection(s);
      expect(pendingPromptText(s)).toBe(DECOY_CONFIRMATION);
      expect(fieldCardIds(s)).toContain(PLAYABLE_SOURCE);
      selectCards(s, [s.inst("decoyHolder").instanceId]);
      await settleBackToTurnPlayer(s);

      expect(fieldCardIds(s)).toEqual([ENDANGERED, BYSTANDER, BYSTANDER, PLAYABLE_SOURCE]);
      expect(decoyPreventions(s)).toHaveLength(1);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});

describe("one ＜Decoy＞ when two of its Digimon would be deleted", () => {
  async function sweepBystanders(s: EngineSetup) {
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sweep").instanceId })).toEqual({
      ok: true,
    });
    await waitForSeatOneSelection(s);
  }

  it("asks which Digimon to save only after the player uses ＜Decoy＞", async () => {
    const { s, loop } = await startTurn();
    try {
      await sweepBystanders(s);
      expect(pendingPromptText(s)).toBe(DECOY_CONFIRMATION);
      expect(pendingCandidates(s)).toEqual([s.inst("decoyHolder").instanceId]);
      expect(promptCount(s, DECOY_TARGET_CHOICE)).toBe(0);
      selectCards(s, [s.inst("decoyHolder").instanceId]);
      await waitForSeatOneSelection(s);
      expect(pendingPromptText(s)).toBe(DECOY_TARGET_CHOICE);
      expect([...pendingCandidates(s)].sort()).toEqual(
        [s.inst("firstBystander").instanceId, s.inst("secondBystander").instanceId].sort(),
      );
      selectCards(s, [s.inst("secondBystander").instanceId]);
      await settleBackToTurnPlayer(s);

      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
        s.inst("endangered").instanceId,
        s.inst("secondBystander").instanceId,
      ]);
      expect(decoyPreventions(s)).toMatchObject([{ permanentId: s.perm("secondBystander").permanentId }]);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("asks once and never asks for a target when the player declines ＜Decoy＞", async () => {
    const { s, loop } = await startTurn();
    try {
      await sweepBystanders(s);
      selectCards(s, []);
      await settleBackToTurnPlayer(s);

      expect(promptCount(s, DECOY_CONFIRMATION)).toBe(1);
      expect(promptCount(s, DECOY_TARGET_CHOICE)).toBe(0);
      expect(fieldCardIds(s)).toEqual([ENDANGERED]);
      expect(decoyPreventions(s)).toEqual([]);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
