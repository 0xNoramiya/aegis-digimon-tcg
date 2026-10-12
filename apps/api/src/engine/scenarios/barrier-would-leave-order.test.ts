import { describe, expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle, type EngineSetup } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import fixture from "#api/engine/scenarios/barrier-would-leave-order.fixture";
import "#api/cards/index";

const SILPHYMON = "BT24-037";
const BARRIER_SOURCE = "ST19-07";

function offeredOrder(s: EngineSetup) {
  const options = s.decisions.at(-1)?.req.options;
  return (options?.triggerKeys ?? []).map((key, index) => ({
    key,
    cardId: options?.triggerCardIds?.[index],
    description: options?.triggerDescriptions?.[index] ?? "",
  }));
}

async function loseBattleWithSilphymon() {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false });
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("silphymon").permanentId,
      target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.state.pendingDecision?.kind === "orderTriggers" || s.events.some((event) => event.kind === "barrierPrompt"),
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

describe("＜Barrier＞ and a would-leave effect on the same battle loss", () => {
  it("offers both reactions in one order choice before either resolves", async () => {
    const { s, loop } = await loseBattleWithSilphymon();
    try {
      expect(s.events.some((event) => event.kind === "barrierPrompt")).toBe(false);
      expect(s.state.pendingDecision).toMatchObject({ kind: "orderTriggers", seat: 0 });
      const offered = offeredOrder(s);
      expect(offered.map(({ cardId }) => cardId).sort()).toEqual([SILPHYMON, BARRIER_SOURCE]);
      expect(offered.find(({ cardId }) => cardId === BARRIER_SOURCE)?.description).toMatch(/^＜Barrier＞/);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("loses ＜Barrier＞ when the would-leave effect first plays the card that granted it", async () => {
    const { s, loop } = await loseBattleWithSilphymon();
    try {
      const silphymonFirst = offeredOrder(s).find(({ cardId }) => cardId === SILPHYMON)!;
      chooseFirst(s, silphymonFirst.key);
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      const field = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId);
      expect(field).toEqual([s.inst("barrierSource").instanceId]);
      expect(s.events.some((event) => event.kind === "barrierPrompt")).toBe(false);
      expect(s.state.players[0]!.security).toHaveLength(3);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([SILPHYMON]);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("keeps Silphymon and still plays the source when ＜Barrier＞ resolves first", async () => {
    const { s, loop } = await loseBattleWithSilphymon();
    try {
      const barrierFirst = offeredOrder(s).find(({ cardId }) => cardId === BARRIER_SOURCE)!;
      chooseFirst(s, barrierFirst.key);
      await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
      expect(
        s.engine.applyIntent(0, {
          type: "respondBarrier",
          permanentId: s.perm("silphymon").permanentId,
          accept: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      const field = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId);
      expect(field).toEqual([s.inst("silphymon").instanceId, s.inst("barrierSource").instanceId]);
      expect(s.state.players[0]!.security).toHaveLength(2);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
