import { describe, expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle, type EngineSetup } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import fixture from "#api/engine/scenarios/fragment-would-leave-order.fixture";
import "#api/cards/index";

const FRAGMENT_HOLDER = "EX8-055";
const WOULD_LEAVE_SOURCE = "BT24-037";
const PLAYABLE_SOURCE = "BT1-014";

function offeredOrder(s: EngineSetup) {
  const options = s.decisions.at(-1)?.req.options;
  return (options?.triggerKeys ?? []).map((key, index) => ({
    key,
    cardId: options?.triggerCardIds?.[index],
    description: options?.triggerDescriptions?.[index] ?? "",
  }));
}

async function raidIntoFragmentHolder() {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false });
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers" || !observe(s.engine).isAttacking());
  return { s, loop };
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

function fieldCardIds(s: EngineSetup) {
  return s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId);
}

describe("＜Fragment＞ and a would-leave effect on the same deletion", () => {
  it("offers both reactions in one order choice before either resolves", async () => {
    const { s, loop } = await raidIntoFragmentHolder();
    try {
      expect(s.state.pendingDecision).toMatchObject({ kind: "orderTriggers", seat: 1 });
      const offered = offeredOrder(s);
      expect(offered.map(({ cardId }) => cardId).sort()).toEqual([FRAGMENT_HOLDER, WOULD_LEAVE_SOURCE].sort());
      expect(offered.find(({ cardId }) => cardId === FRAGMENT_HOLDER)?.description).toMatch(/^＜Fragment＞/);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("cannot pay ＜Fragment＞ after the would-leave effect plays one of its sources", async () => {
    const { s, loop } = await raidIntoFragmentHolder();
    try {
      chooseFirst(s, offeredOrder(s).find(({ cardId }) => cardId === WOULD_LEAVE_SOURCE)!.key);
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      expect(fieldCardIds(s)).toEqual([PLAYABLE_SOURCE]);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain(FRAGMENT_HOLDER);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("loses the inherited would-leave effect when ＜Fragment＞ first trashes its source", async () => {
    const { s, loop } = await raidIntoFragmentHolder();
    try {
      chooseFirst(s, offeredOrder(s).find(({ cardId }) => cardId === FRAGMENT_HOLDER)!.key);
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      expect(fieldCardIds(s)).toEqual([FRAGMENT_HOLDER]);
      expect(s.perm("fragmentHolder").stack).toHaveLength(0);
      expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(
        ["BT1-027", PLAYABLE_SOURCE, WOULD_LEAVE_SOURCE].sort(),
      );
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("orders the same reactions when an opponent's effect deletes the holder", async () => {
    const s = setupScenario(fixture, { autoAcceptOptional: false, autoSelectCards: true, autoOrderTriggers: false });
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const offered = offeredOrder(s);
      expect(offered.map(({ cardId }) => cardId).sort()).toEqual([FRAGMENT_HOLDER, WOULD_LEAVE_SOURCE].sort());
      chooseFirst(s, offered.find(({ cardId }) => cardId === FRAGMENT_HOLDER)!.key);
      await settle(() => s.perm("fragmentHolder").stack.length === 0 && s.state.pendingDecision?.seat === 0);

      expect(fieldCardIds(s)).toEqual([FRAGMENT_HOLDER]);
      expect(s.perm("fragmentHolder").stack).toHaveLength(0);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
