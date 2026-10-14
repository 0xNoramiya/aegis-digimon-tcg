import { describe, expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle, type EngineSetup } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import fixture from "#api/engine/scenarios/scapegoat-would-leave-order.fixture";
import "#api/cards/index";

const SCAPEGOAT_HOLDER = "EX6-059";
const WOULD_LEAVE_SOURCE = "BT24-037";
const PLAYABLE_SOURCE = "BT1-014";
const BYSTANDER = "BT1-019";

function offeredOrder(s: EngineSetup) {
  const options = s.decisions.at(-1)?.req.options;
  return (options?.triggerKeys ?? []).map((key, index) => ({
    key,
    cardId: options?.triggerCardIds?.[index],
    description: options?.triggerDescriptions?.[index] ?? "",
  }));
}

async function raidIntoScapegoatHolder() {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: false, autoOrderTriggers: false });
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await waitForSelection(s, 0);
  selectCards(s, 0, [s.inst("scapegoatHolder").instanceId]);
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  return { s, loop };
}

async function waitForSelection(s: EngineSetup, seat: 0 | 1) {
  await settle(() => s.state.pendingDecision?.kind === "selectCards" && s.state.pendingDecision.seat === seat);
}

function selectCards(s: EngineSetup, seat: 0 | 1, instanceIds: string[]) {
  expect(
    s.engine.applyIntent(seat, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "selectCards", instanceIds },
    }),
  ).toEqual({ ok: true });
}

function chooseFirst(s: EngineSetup, key: string) {
  expect(
    s.engine.applyIntent(1, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "orderTriggers", order: [key] },
    }),
  ).toEqual({ ok: true });
}

function sacrificeCandidates(s: EngineSetup) {
  return s.decisions.at(-1)?.req.options?.candidateInstanceIds ?? [];
}

function fieldCardIds(s: EngineSetup) {
  return s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId);
}

describe("＜Scapegoat＞ and a would-leave effect on the same deletion", () => {
  it("offers both reactions in one order choice before either resolves", async () => {
    const { s, loop } = await raidIntoScapegoatHolder();
    try {
      expect(s.state.pendingDecision).toMatchObject({ kind: "orderTriggers", seat: 1 });
      const offered = offeredOrder(s);
      expect(offered.map(({ cardId }) => cardId).sort()).toEqual([SCAPEGOAT_HOLDER, WOULD_LEAVE_SOURCE].sort());
      expect(offered.find(({ cardId }) => cardId === SCAPEGOAT_HOLDER)?.description).toMatch(/^＜Scapegoat＞/);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("can sacrifice the Digimon the would-leave effect played first", async () => {
    const { s, loop } = await raidIntoScapegoatHolder();
    try {
      chooseFirst(s, offeredOrder(s).find(({ cardId }) => cardId === WOULD_LEAVE_SOURCE)!.key);
      await waitForSelection(s, 1);
      expect([...sacrificeCandidates(s)].sort()).toEqual(
        [s.inst("playableSource").instanceId, s.inst("bystander").instanceId].sort(),
      );
      selectCards(s, 1, [s.inst("playableSource").instanceId]);
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      expect(fieldCardIds(s)).toEqual([SCAPEGOAT_HOLDER, BYSTANDER]);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([PLAYABLE_SOURCE]);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("deletes the other Digimon with ＜Scapegoat＞ first and still plays the source", async () => {
    const { s, loop } = await raidIntoScapegoatHolder();
    try {
      chooseFirst(s, offeredOrder(s).find(({ cardId }) => cardId === SCAPEGOAT_HOLDER)!.key);
      await waitForSelection(s, 1);
      expect([...sacrificeCandidates(s)]).toEqual([s.inst("bystander").instanceId]);
      selectCards(s, 1, [s.inst("bystander").instanceId]);
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      expect(fieldCardIds(s)).toEqual([SCAPEGOAT_HOLDER, PLAYABLE_SOURCE]);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([BYSTANDER]);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("orders the same reactions when an opponent's effect deletes the holder", async () => {
    const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: false, autoOrderTriggers: false });
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "chooseTargets", instanceIds: [s.perm("scapegoatHolder").permanentId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const offered = offeredOrder(s);
      expect(offered.map(({ cardId }) => cardId).sort()).toEqual([SCAPEGOAT_HOLDER, WOULD_LEAVE_SOURCE].sort());
      chooseFirst(s, offered.find(({ cardId }) => cardId === SCAPEGOAT_HOLDER)!.key);
      await waitForSelection(s, 1);
      selectCards(s, 1, [s.inst("bystander").instanceId]);
      await settle(() => fieldCardIds(s).length === 2 && s.state.pendingDecision?.seat === 0);

      expect(fieldCardIds(s)).toEqual([SCAPEGOAT_HOLDER, PLAYABLE_SOURCE]);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([BYSTANDER]);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
