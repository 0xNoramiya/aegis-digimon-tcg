import { describe, expect, it } from "vitest";
import type { ScenarioFixture } from "#api/engine/scenario/types";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle, type EngineSetup } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import evadeFixture from "#api/engine/scenarios/evade-would-leave-order.fixture";
import fragmentFixture from "#api/engine/scenarios/fragment-would-leave-order.fixture";
import scapegoatFixture from "#api/engine/scenarios/scapegoat-would-leave-order.fixture";
import decoyFixture from "#api/engine/scenarios/decoy-would-leave-order.fixture";
import "#api/cards/index";

const PLAYABLE_SOURCE = "BT1-014";

type OfferedEntry = { key: string; cardId: string | undefined; isOptional: boolean | undefined };

function offeredOrder(s: EngineSetup): OfferedEntry[] {
  const options = s.decisions.at(-1)?.req.options;
  return (options?.triggerKeys ?? []).map((key, index) => ({
    key,
    cardId: options?.triggerCardIds?.[index],
    isOptional: options?.triggerIsOptional?.[index],
  }));
}

function answerFirstWithPreset(s: EngineSetup, seat: 0 | 1, cardId: string, accept: boolean) {
  const entry = offeredOrder(s).find((offered) => offered.cardId === cardId)!;
  expect(entry.isOptional).toBe(true);
  expect(
    s.engine.applyIntent(seat, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "orderTriggers", order: [entry.key], optionalAnswers: { [entry.key]: accept } },
    }),
  ).toEqual({ ok: true });
}

function keywordPrompts(s: EngineSetup, keyword: string) {
  return s.decisions.filter(({ req }) => req.kind !== "orderTriggers" && req.promptText?.startsWith(`＜${keyword}`));
}

function fieldCardIds(s: EngineSetup, seat: 0 | 1) {
  return s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard.cardId);
}

function chooseRemovalTarget(s: EngineSetup, target: string) {
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm(target).permanentId] },
    }),
  ).toEqual({ ok: true });
}

async function deleteWithGaiaForce(fixture: ScenarioFixture, target: string) {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: false, autoOrderTriggers: false });
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({
    ok: true,
  });
  await settle(
    () => s.state.pendingDecision?.kind === "chooseTargets" || s.state.pendingDecision?.kind === "orderTriggers",
  );
  if (s.state.pendingDecision?.kind === "chooseTargets") {
    chooseRemovalTarget(s, target);
  }
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  return { s, loop };
}

async function settleUntilSeatOneIsDone(s: EngineSetup) {
  await settle(
    () =>
      s.state.pendingDecision === undefined ||
      s.state.pendingDecision.seat === 0 ||
      s.state.pendingDecision.kind === "selectCards",
  );
}

describe("a Yes or No preset on a keyword in the would-leave order", () => {
  async function raidIntoEvadeHolder() {
    const s = setupScenario(evadeFixture, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: false,
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    return { s, loop };
  }

  async function settleAfterBattle(s: EngineSetup) {
    await settle(
      () =>
        s.events.some((event) => event.kind === "evadePrompt") ||
        (!observe(s.engine).isAttacking() && s.state.pendingDecision === undefined),
    );
  }

  it("uses ＜Evade＞ on Yes without opening the ＜Evade＞ dialog", async () => {
    const { s, loop } = await raidIntoEvadeHolder();
    try {
      answerFirstWithPreset(s, 0, "BT13-031", true);
      await settleAfterBattle(s);

      expect(s.events.some((event) => event.kind === "evadePrompt")).toBe(false);
      expect(fieldCardIds(s, 0)).toEqual(["BT13-031", PLAYABLE_SOURCE]);
      expect(s.perm("evadeHolder").isSuspended).toBe(true);
    } finally {
      s.engine.applyIntent(1, { type: "surrender" });
      await loop;
    }
  });

  it("skips ＜Evade＞ on No without opening the ＜Evade＞ dialog", async () => {
    const { s, loop } = await raidIntoEvadeHolder();
    try {
      answerFirstWithPreset(s, 0, "BT13-031", false);
      await settleAfterBattle(s);

      expect(s.events.some((event) => event.kind === "evadePrompt")).toBe(false);
      expect(fieldCardIds(s, 0)).toEqual([PLAYABLE_SOURCE]);
    } finally {
      s.engine.applyIntent(1, { type: "surrender" });
      await loop;
    }
  });

  it("pays ＜Fragment＞ on Yes without asking again when every source must go", async () => {
    const { s, loop } = await deleteWithGaiaForce(fragmentFixture, "fragmentHolder");
    try {
      answerFirstWithPreset(s, 1, "EX8-055", true);
      await settleUntilSeatOneIsDone(s);

      expect(keywordPrompts(s, "Fragment")).toEqual([]);
      expect(fieldCardIds(s, 1)).toEqual(["EX8-055"]);
      expect(s.perm("fragmentHolder").stack).toHaveLength(0);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("pays ＜Scapegoat＞ on Yes without asking again when only one Digimon can be deleted", async () => {
    const { s, loop } = await deleteWithGaiaForce(scapegoatFixture, "scapegoatHolder");
    try {
      answerFirstWithPreset(s, 1, "EX6-059", true);
      await settleUntilSeatOneIsDone(s);

      expect(keywordPrompts(s, "Scapegoat")).toEqual([]);
      expect(fieldCardIds(s, 1)).toEqual(["EX6-059", PLAYABLE_SOURCE]);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-019"]);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("uses ＜Decoy＞ on Yes without asking again when it can save only one Digimon", async () => {
    const { s, loop } = await deleteWithGaiaForce(decoyFixture, "endangered");
    try {
      answerFirstWithPreset(s, 1, "TOKEN-AthoRenePor-Token", true);
      await settleUntilSeatOneIsDone(s);

      expect(keywordPrompts(s, "Decoy")).toEqual([]);
      expect(fieldCardIds(s, 1)).toEqual(["BT1-024", "BT1-009", "BT1-009", PLAYABLE_SOURCE]);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
