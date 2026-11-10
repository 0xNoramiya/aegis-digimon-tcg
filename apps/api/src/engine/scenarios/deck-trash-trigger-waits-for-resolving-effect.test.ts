import { expect, it } from "vitest";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/deck-trash-trigger-waits-for-resolving-effect.fixture";
import { advance } from "#api/engine/testkit/advance";
import { finishTurnLoop } from "#api/engine/testkit/finishTurnLoop";
import { settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { setupScenario } from "#api/engine/testkit/scenario";

it("finishes the milling effect's deletion before the milled cards' own triggers activate", async () => {
  const s = setupScenario(fixture, { autoOrderTriggers: false });
  await s.ready();
  const player = s.state.players[0]!;
  const opponent = s.state.players[1]!;
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    const playLockInstanceId = s.inst("playLock").instanceId;
    const impmonInstanceId = s.inst("milledImpmon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision !== undefined);
    const millPrompt = s.decisions.at(-1)!.req;
    expect(millPrompt).toMatchObject({ kind: "optional", sourceCardId: "EX2-039" });
    expect(opponent.battleArea).toHaveLength(0);
    expect(opponent.trash.map((card) => card.instanceId)).toEqual([playLockInstanceId]);
    expect(player.trash.map((card) => card.cardId)).toEqual(["EX2-039", "BT1-009"]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: millPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision !== undefined);
    const amountPrompt = s.decisions.at(-1)!.req;
    expect(amountPrompt).toMatchObject({ kind: "chooseOption", sourceCardId: "EX2-039" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: amountPrompt.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision !== undefined);
    const playPrompt = s.decisions.at(-1)!.req;
    expect(playPrompt).toMatchObject({ kind: "optional", sourceCardId: "EX2-044" });
    expect(player.trash.map((card) => card.cardId)).toEqual(["EX2-039", "BT1-009", "EX2-044"]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.decisions).toHaveLength(4);
    expect(s.decisions[3]!.req).toMatchObject({ kind: "orderCards", sourceCardId: "EX2-039" });
    expect(player.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("attacker").instanceId,
      impmonInstanceId,
    ]);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(player.trash.map((card) => card.cardId)).toEqual(["BT1-009", "EX2-044"]);
    expect(player.deck).toHaveLength(10);
    expect(opponent.battleArea).toHaveLength(0);
    expect(opponent.security).toHaveLength(4);
    expect(opponent.trash.map((card) => card.cardId)).toEqual(["BT9-033", "BT1-009"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.gameOver).toBe(false);
  } finally {
    await finishTurnLoop({ setup: s, loop });
  }
});
