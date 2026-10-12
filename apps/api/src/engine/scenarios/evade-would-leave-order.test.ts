import { describe, expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle, type EngineSetup } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import fixture from "#api/engine/scenarios/evade-would-leave-order.fixture";
import "#api/cards/index";

const EVADE_HOLDER = "BT13-031";
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

async function raidIntoEvadeHolder() {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false });
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(1);
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.state.pendingDecision?.kind === "orderTriggers" || s.events.some((event) => event.kind === "evadePrompt"),
  );
  return { s, loop };
}

function chooseFirst(s: EngineSetup, key: string) {
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "orderTriggers", order: [key] },
    }),
  ).toEqual({ ok: true });
}

function acceptEvade(s: EngineSetup) {
  expect(
    s.engine.applyIntent(0, { type: "respondEvade", permanentId: s.perm("evadeHolder").permanentId, accept: true }),
  ).toEqual({ ok: true });
}

function fieldCardIds(s: EngineSetup) {
  return s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId);
}

describe("＜Evade＞ and a would-leave effect on the same battle loss", () => {
  it("offers both reactions in one order choice before either resolves", async () => {
    const { s, loop } = await raidIntoEvadeHolder();
    try {
      expect(s.events.some((event) => event.kind === "evadePrompt")).toBe(false);
      expect(s.state.pendingDecision).toMatchObject({ kind: "orderTriggers", seat: 0 });
      const offered = offeredOrder(s);
      expect(offered.map(({ cardId }) => cardId).sort()).toEqual([EVADE_HOLDER, WOULD_LEAVE_SOURCE].sort());
      expect(offered.find(({ cardId }) => cardId === EVADE_HOLDER)?.description).toMatch(/^＜Evade＞/);
    } finally {
      s.engine.applyIntent(1, { type: "surrender" });
      await loop;
    }
  });

  it("plays the source first and still offers ＜Evade＞ afterwards", async () => {
    const { s, loop } = await raidIntoEvadeHolder();
    try {
      chooseFirst(s, offeredOrder(s).find(({ cardId }) => cardId === WOULD_LEAVE_SOURCE)!.key);
      await settle(() => s.events.some((event) => event.kind === "evadePrompt"));
      expect(fieldCardIds(s)).toEqual([EVADE_HOLDER, PLAYABLE_SOURCE]);
      acceptEvade(s);
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      expect(fieldCardIds(s)).toEqual([EVADE_HOLDER, PLAYABLE_SOURCE]);
      expect(s.perm("evadeHolder").isSuspended).toBe(true);
    } finally {
      s.engine.applyIntent(1, { type: "surrender" });
      await loop;
    }
  });

  it("suspends with ＜Evade＞ first and still resolves the would-leave effect", async () => {
    const { s, loop } = await raidIntoEvadeHolder();
    try {
      chooseFirst(s, offeredOrder(s).find(({ cardId }) => cardId === EVADE_HOLDER)!.key);
      await settle(() => s.events.some((event) => event.kind === "evadePrompt"));
      expect(fieldCardIds(s)).toEqual([EVADE_HOLDER]);
      acceptEvade(s);
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      expect(fieldCardIds(s)).toEqual([EVADE_HOLDER, PLAYABLE_SOURCE]);
      expect(s.perm("evadeHolder").isSuspended).toBe(true);
    } finally {
      s.engine.applyIntent(1, { type: "surrender" });
      await loop;
    }
  });
});
