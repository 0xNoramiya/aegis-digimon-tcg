import { Phase, type DecisionRequest } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario, type DevScenarioId } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type SetupEngineOptions } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

async function start(id: DevScenarioId, options: SetupEngineOptions = {}) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, ...options },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

async function passToOpponentMain(s: Awaited<ReturnType<typeof start>>["s"]) {
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
}

it("GitHub #5427: Detach asks yes/no after a security loss and keeps Gomimon", async () => {
  const { s, loop } = await start("arena-github-5427-gomimon-detach");
  try {
    const human = s.state.players[0]!;
    const gomimon = human.battleArea[0]!;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: gomimon.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(human.battleArea.map((p) => p.permanentId)).toContain(gomimon.permanentId);
    expect(gomimon.linked).toHaveLength(0);
    expect(human.trash.some((card) => card.cardId === "BT26-063")).toBe(true);
    const detach = s.decisions.filter(
      ({ req }) => req.kind === "optional" && req.promptText.includes("Gomimon doesn't leave the battle area"),
    );
    expect(detach).toHaveLength(1);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it("GitHub #5430: Gankoomon's Sistermon Noir with no Sistermon labels the De-Digivolve target prompt", async () => {
  const { s, loop } = await start("arena-github-5430-gankoomon-noir-no-sistermon", {
    autoSelectCards: false,
    preferInstanceIds: [],
  });
  try {
    const gankoomon = s.state.players[0]!.battleArea[0]!;
    const [victim, bystander] = s.state.players[1]!.battleArea;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: gankoomon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    let targetPrompt: DecisionRequest | undefined;
    for (let answered = 0; answered < 10; answered++) {
      await settle(() => s.state.pendingDecision !== undefined || !observe(s.engine).isAttacking());
      const request = s.decisions.at(-1)?.req;
      if (s.state.pendingDecision === undefined || request === undefined) break;
      if (request.kind === "selectCards") {
        const noir = gankoomon.stack.find((card) => card.cardId === "EX13-066")!;
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: { kind: "selectCards", instanceIds: [noir.instanceId] },
        } as never);
      } else if (request.kind === "chooseTargets" && request.sourceCardId === "EX13-066") {
        targetPrompt = request;
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: { kind: "chooseTargets", instanceIds: [victim!.permanentId] },
        } as never);
      } else break;
    }
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(targetPrompt?.options?.effectTextPart).toBe(
      "Then, to 1 of your opponent's Digimon, ＜De-Digivolve 1＞ for each of your Digimon.",
    );
    expect(targetPrompt?.options?.candidateInstanceIds).toEqual([victim!.permanentId, bystander!.permanentId]);
    expect(victim!.stack).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX13-066")).toBe(true);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it("GitHub #5431: Yao Qinglan pays its By-cost with nothing to place, and Poseidia Lagoon answers", async () => {
  const { s, loop } = await start("arena-github-5431-yao-suspend-without-placement");
  try {
    const human = s.state.players[0]!;
    const [lagoon, yao, whamon] = human.battleArea;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: whamon!.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(yao!.isSuspended).toBe(true);
    expect(whamon!.topCard.cardId).toBe("BT22-027");
    expect(s.state.memory).toBe(3);
    expect(human.trash.some((card) => card.instanceId === lagoon!.topCard.instanceId)).toBe(true);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it("GitHub #5428: MegaKabuterimon digivolves onto [Insectoid] trait Lv.4s for its alternate cost 3", async () => {
  const { s, loop } = await start("arena-github-5428-megakabuterimon-insectoid");
  try {
    const human = s.state.players[0]!;
    const [kabuterimon, hudiemon] = human.battleArea;
    const [first, second] = human.hand.filter((card) => card.cardId === "P-140");
    for (const [base, card] of [
      [kabuterimon!, first!],
      [hudiemon!, second!],
    ] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: base.permanentId,
          instanceId: card.instanceId,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await settle(() => base.topCard.instanceId === card.instanceId && s.state.pendingDecision === undefined);
    }
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it("GitHub #5423: Knightmon's inherited play answers an opposing attack before blocker timing", async () => {
  const { s, loop } = await start("arena-github-5423-knightmon-opponent-attack");
  try {
    await passToOpponentMain(s);
    const attacker = s.state.players[1]!.battleArea[0]!;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const gotsumon = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT2-054");
    expect(gotsumon).toBeDefined();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT2-054")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: gotsumon!.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.events.some((event) => event.kind === "blocked")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(3);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
