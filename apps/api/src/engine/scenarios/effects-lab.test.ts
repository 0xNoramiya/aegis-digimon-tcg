import { fixtureVariant, fixturePermanentId } from "../scenario/references.js";
import fixtureOwnChain from "./own-chain.fixture.js";
import fixturePaladinBattle from "./paladin-battle.fixture.js";
import fixtureOpponentChain from "./opponent-chain.fixture.js";
import fixtureNested from "./nested.fixture.js";
import fixtureProdRoyalKnights from "./prod-royal-knights.fixture.js";
import fixtureProdGhost from "./prod-ghost.fixture.js";
import fixtureProdGhostExecute from "./prod-ghost-execute.fixture.js";
import fixtureProdGhostExecuteSecurity from "./prod-ghost-execute-security.fixture.js";
import fixtureProdAttackStack from "./prod-attack-stack.fixture.js";
import fixtureProdSecurityRemoved from "./prod-security-removed.fixture.js";
import fixtureProdTitanCascade from "./prod-titan-cascade.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase, type DecisionRequest, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import type { ScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, type EngineSetup, type SetupEngineOptions } from "../testkit/harness.js";

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

async function startScenario(scenario: ScenarioFixture, options: SetupEngineOptions = {}): Promise<EngineSetup> {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoSelectCards: true, autoAcceptOptional: true, declineDigiXros: true, ...options },
  );
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startScenarioFixture(scenario);
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return s;
}

/** Ticks until `done` holds, passing the bot's breeding phase so its turn can reach main. */
async function runUntil(s: EngineSetup, done: () => boolean): Promise<void> {
  for (let step = 0; step < 600 && !done(); step += 1) {
    if (s.state.pendingDecision === undefined && s.state.phase === Phase.Breeding && s.state.turnSeat === 1) {
      s.engine.applyIntent(1, { type: "endPhase" });
    }
    await tick();
  }
  expect(done()).toBe(true);
}

async function drain(s: EngineSetup): Promise<void> {
  for (let step = 0; step < 400 && s.state.pendingDecision !== undefined; step += 1) await tick();
  for (let step = 0; step < 50; step += 1) await tick();
}

function triggeredCardIds(s: EngineSetup, seat?: Seat, fromEvent = 0): string[] {
  return s.events
    .slice(fromEvent)
    .flatMap((event) =>
      event.kind === "effectTriggered" && (seat === undefined || event.seat === seat) ? [event.sourceCardId] : [],
    );
}

function resolvedCount(s: EngineSetup, fromEvent = 0): number {
  return s.events.slice(fromEvent).filter((event) => event.kind === "effectResolved").length;
}

function orderPrompts(s: EngineSetup, seat: Seat): DecisionRequest[] {
  return s.decisions.filter((entry) => entry.seat === seat && entry.req.kind === "orderTriggers").map(({ req }) => req);
}

function hand(s: EngineSetup, seat: Seat): number {
  return s.state.players[seat]!.hand.length;
}

function chainOf(s: EngineSetup, fromEvent: number): string[] {
  return s.events
    .slice(fromEvent)
    .flatMap((event) =>
      event.kind === "effectTriggered"
        ? [`${event.seat}:${event.sourceCardId}`]
        : event.kind === "securityChecked"
          ? ["check"]
          : event.kind === "attackDeclared"
            ? ["attack"]
            : [],
    );
}

function largestOrderPrompt(s: EngineSetup, seat: Seat, fromDecision = 0): number {
  return Math.max(
    0,
    ...orderPrompts({ ...s, decisions: s.decisions.slice(fromDecision) }, seat).map(
      (req) => req.options?.triggerKeys?.length ?? 0,
    ),
  );
}

function permanentOf(s: EngineSetup, seat: Seat, cardId: string) {
  return s.state.players[seat]!.battleArea.find((permanent) => permanent.topCard.cardId === cardId)!;
}

describe("Effects Lab dev scenarios", () => {
  it("effects-lab-own-chain: one digivolution opens a six-effect resolution plan", async () => {
    const s = await startScenario(fixtureOwnChain);
    try {
      const human = s.state.players[0]!;
      const golemon = human.battleArea.find((permanent) => permanent.topCard.cardId === "BT10-062")!;
      const megadramon = human.hand.find((card) => card.cardId === "BT9-065")!;
      const handBefore = hand(s, 0);
      const memoryBefore = s.state.memory;
      const firstEvent = s.events.length;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: golemon.permanentId,
          instanceId: megadramon.instanceId,
        }),
      ).toEqual({ ok: true });
      await drain(s);

      const [plan] = orderPrompts(s, 0);
      expect(plan?.options?.acceptsResolutionPlan).toBe(true);
      expect([...plan!.options!.triggerCardIds!].sort()).toEqual([
        "BT16-088",
        "BT5-091",
        "BT9-065",
        "EX4-003",
        "EX4-038",
        "EX4-039",
      ]);
      expect(triggeredCardIds(s, 0, firstEvent)).toHaveLength(6);
      expect(resolvedCount(s, firstEvent)).toBe(6);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(hand(s, 0)).toBe(handBefore + 2);
      expect(s.state.memory).toBe(memoryBefore - 4 + 3);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  it("effects-lab-paladin-battle: EX13-076 strips BeelStarmon and battles it without an attack", async () => {
    const s = await startScenario(fixturePaladinBattle);
    try {
      const human = s.state.players[0]!;
      const ulforce = human.battleArea.find((permanent) => permanent.topCard.cardId === "EX13-023")!;
      const paladin = human.hand.find((card) => card.cardId === "EX13-076")!;
      const beelstarmon = s.state.players[1]!.battleArea[0]!;
      const firstEvent = s.events.length;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: ulforce.permanentId,
          instanceId: paladin.instanceId,
        }),
      ).toEqual({ ok: true });
      await drain(s);

      const events = s.events.slice(firstEvent);
      const stripped = events.findIndex((event) => event.kind === "cardsMoved" && event.to === "deck");
      const compared = events.findIndex((event) => event.kind === "battleCompared");
      const deleted = events.findIndex((event) => event.kind === "cardsMoved" && event.battleDeletion === true);
      expect(events[compared]).toMatchObject({
        attackerPermanentId: ulforce.permanentId,
        defenderPermanentId: beelstarmon.permanentId,
        loserPermanentIds: [beelstarmon.permanentId],
        effectBattle: { attackerSeat: 0, attackerCardId: "EX13-076", defenderCardId: "BT25-085" },
      });
      expect(stripped).toBeGreaterThanOrEqual(0);
      expect(stripped).toBeLessThan(compared);
      expect(compared).toBeLessThan(deleted);
      expect(events.some((event) => event.kind === "attackDeclared")).toBe(false);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  it("effects-lab-opponent-chain: ending the turn lets the bot resolve five start-of-main effects", async () => {
    const s = await startScenario(fixtureOpponentChain);
    try {
      const botHandBefore = hand(s, 1);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await runUntil(
        s,
        () => s.state.turnSeat === 1 && s.state.phase === Phase.Main && triggeredCardIds(s, 1).length >= 5,
      );
      await drain(s);

      const [plan] = orderPrompts(s, 1);
      expect(plan?.options?.acceptsResolutionPlan).toBe(true);
      expect([...plan!.options!.triggerCardIds!].sort()).toEqual(["BT26-104", "EX8-011", "LM-002", "P-199", "P-200"]);
      expect(triggeredCardIds(s, 1)).toHaveLength(5);
      expect(resolvedCount(s)).toBeGreaterThanOrEqual(5);
      expect(orderPrompts(s, 0)).toHaveLength(0);
      expect(s.state.players[0]!.battleArea[0]!.isSuspended).toBe(true);
      expect(hand(s, 1)).toBe(botHandBefore + 2);
      const tyrannomon = s.state.players[1]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX8-011")!;
      expect(tyrannomon.currentDP).toBeGreaterThanOrEqual(5000 + 3000);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  it("effects-lab-nested: one attack nests When Attacking, On Deletion and a security On Play", async () => {
    const s = await startScenario(fixtureNested);
    try {
      const gallantmon = s.state.players[0]!.battleArea[0]!;
      const botHandBefore = hand(s, 1);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: gallantmon.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await drain(s);

      const [plan] = orderPrompts(s, 0);
      expect(plan?.options?.acceptsResolutionPlan).toBe(true);
      expect([...plan!.options!.triggerCardIds!].sort()).toEqual(["LM-002", "ST7-09"]);
      expect(triggeredCardIds(s)).toEqual(["ST7-09", "ST7-08", "BT2-070", "LM-002", "BT4-093", "BT4-093"]);
      expect(resolvedCount(s)).toBe(6);
      expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(3);
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT4-093"]);
      expect(s.state.players[1]!.security).toHaveLength(2);
      expect(hand(s, 1)).toBe(botHandBefore + 2);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  it("effects-lab-prod-royal-knights: three Cool Boy triggers, then The Last Guardian from security", async () => {
    const s = await startScenario(fixtureProdRoyalKnights);
    try {
      const human = s.state.players[0]!;
      const zudomon = human.battleArea.find((permanent) => permanent.topCard.cardId === "BT2-027")!;
      const ulforce = human.hand.find((card) => card.cardId === "ST8-10")!;
      const memoryBefore = s.state.memory;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: zudomon.permanentId,
          instanceId: ulforce.instanceId,
        }),
      ).toEqual({ ok: true });
      await drain(s);

      const [plan] = orderPrompts(s, 0);
      expect(plan?.options?.acceptsResolutionPlan).toBe(true);
      expect([...plan!.options!.triggerCardIds!].sort()).toEqual(["BT20-091", "BT20-091", "BT20-091", "ST8-10"]);
      expect(triggeredCardIds(s, 0).filter((cardId) => cardId === "BT20-091")).toHaveLength(3);
      expect(
        human.battleArea.filter(({ isSuspended, topCard }) => topCard.cardId === "BT20-091" && isSuspended),
      ).toHaveLength(3);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.memory).toBe(memoryBefore - 4 + 3);

      const royalKnight = human.battleArea.find((permanent) => permanent.topCard.cardId === "ST8-10")!;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: royalKnight.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await drain(s);

      expect(triggeredCardIds(s, 1)).toContain("BT20-100");
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual([
        "BT20-091",
        "BT20-100",
      ]);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  it("effects-lab-prod-ghost: Execute attack chains Violet Inboots, Soul Banquet, Kunlun and Phantomon", async () => {
    const s = await startScenario(fixtureProdGhost, {
      preferInstanceIds: [fixtureInstanceId("lab-ghost-discard-card")],
      declinePrompts: ["Digivolve"],
    });
    try {
      const firstEvent = s.events.length;
      advance(s.engine).endMainPhaseIfOpen(0);
      await runUntil(s, () => s.state.turnSeat === 1);
      await drain(s);

      const chain = s.events
        .slice(firstEvent)
        .flatMap((event) =>
          event.kind === "effectTriggered" ? [event.sourceCardId] : event.kind === "securityChecked" ? ["check"] : [],
        );
      expect(chain).toEqual([
        "BT20-072",
        "EX11-068",
        "BT23-098",
        "BT26-104",
        "BT26-104",
        "check",
        "BT20-072",
        "BT20-072",
        "BT20-063",
      ]);
      expect(resolvedCount(s, firstEvent)).toBe(8);
      const human = s.state.players[0]!;
      expect(human.battleArea.some(({ topCard }) => topCard.cardId === "BT20-072")).toBe(false);
      expect(human.battleArea.some(({ topCard }) => topCard.cardId === "BT20-063")).toBe(true);
      expect(human.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT20-072", "BT23-098"]));
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT26-104"]);
      expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("EX12-006");
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  describe("production chains rebuilt from the logs", () => {
    const executeChain = [
      "0:EX11-051",
      "attack",
      "0:EX11-068",
      "check",
      "0:EX11-051",
      "0:BT20-006",
      "0:BT20-063",
      "0:BT20-068",
      "0:BT23-065",
      "0:BT20-063",
      "0:BT20-006",
      "0:EX11-051",
      "0:EX11-051",
      "0:BT20-088",
    ];

    it("effects-lab-prod-ghost-execute: one deletion puts eight [On Deletion] effects in one order prompt", async () => {
      const s = await startScenario(fixtureProdGhostExecute, { autoChooseOption: true });
      try {
        const firstEvent = s.events.length;
        advance(s.engine).endMainPhaseIfOpen(0);
        await runUntil(s, () => s.state.turnSeat === 1);
        await drain(s);

        expect(chainOf(s, firstEvent)).toEqual(executeChain);
        expect(largestOrderPrompt(s, 0)).toBeGreaterThanOrEqual(8);
        expect(resolvedCount(s, firstEvent)).toBe(12);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
      }
    });

    it("effects-lab-prod-ghost-execute-security: the bot's [Security] lands inside the Execute chain", async () => {
      const s = await startScenario(fixtureProdGhostExecuteSecurity, { autoChooseOption: true });
      try {
        const firstEvent = s.events.length;
        advance(s.engine).endMainPhaseIfOpen(0);
        await runUntil(s, () => s.state.turnSeat === 1);
        await drain(s);

        const [attack, ...afterAttack] = executeChain.slice(1);
        expect(chainOf(s, firstEvent)).toEqual([
          "0:EX11-051",
          attack,
          afterAttack[0],
          "1:ST20-14",
          ...afterAttack.slice(1),
        ]);
        expect(resolvedCount(s, firstEvent)).toBe(13);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
      }
    });

    it("effects-lab-prod-attack-stack: a digivolution attacks at once into four [When Attacking] effects and the bot's watchers", async () => {
      const s = await startScenario(fixtureProdAttackStack, {
        autoChooseOption: true,
        preferInstanceIds: ["first", "second", "third", "fourth", "fifth"].map((slot) =>
          fixtureVariant(
            {
              first: fixturePermanentId("opponent-lab-attack-target-first"),
              second: fixturePermanentId("opponent-lab-attack-target-second"),
              third: fixturePermanentId("opponent-lab-attack-target-third"),
              fourth: fixturePermanentId("opponent-lab-attack-target-fourth"),
              fifth: fixturePermanentId("opponent-lab-attack-target-fifth"),
            },
            slot,
          ),
        ),
      });
      try {
        const firstEvent = s.events.length;
        const firstDecision = s.decisions.length;
        const zwart = s.state.players[0]!.hand.find((card) => card.cardId === "EX13-077")!;
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: permanentOf(s, 0, "AD1-025").permanentId,
            instanceId: zwart.instanceId,
          }),
        ).toEqual({ ok: true });
        await drain(s);

        const chain = chainOf(s, firstEvent);
        expect(chain.slice(0, 6)).toEqual(["0:EX13-077", "attack", "0:EX9-019", "0:AD1-014", "0:ST21-05", "0:AD1-004"]);
        expect(chain).toEqual(expect.arrayContaining(["1:BT25-016", "1:BT25-058"]));
        expect(largestOrderPrompt(s, 0, firstDecision)).toBe(4);
        expect(resolvedCount(s, firstEvent)).toBeGreaterThanOrEqual(10);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
      }
    });

    it("effects-lab-prod-security-removed: taking a security card wakes three watchers and a digivolution", async () => {
      const s = await startScenario(fixtureProdSecurityRemoved, { autoChooseOption: true });
      try {
        const firstEvent = s.events.length;
        const firstDecision = s.decisions.length;
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: permanentOf(s, 0, "BT26-103").permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await drain(s);

        expect(chainOf(s, firstEvent)).toEqual([
          "attack",
          "0:BT24-031",
          "0:BT26-103",
          "0:BT24-101",
          "0:BT24-084",
          "0:BT25-025",
          "check",
        ]);
        expect(largestOrderPrompt(s, 0, firstDecision)).toBe(3);
        expect(permanentOf(s, 0, "BT25-025")).toBeDefined();
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
      }
    });

    it("effects-lab-prod-titan-cascade: a hand trash and a play from trash wake five effects at once", async () => {
      const s = await startScenario(fixtureProdTitanCascade, {
        autoChooseOption: true,
        preferInstanceIds: [fixtureInstanceId("lab-titan-discard-card"), fixtureInstanceId("lab-titan-witchmon-card")],
      });
      try {
        const firstEvent = s.events.length;
        const firstDecision = s.decisions.length;
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: permanentOf(s, 0, "BT26-059").permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await drain(s);

        expect(chainOf(s, firstEvent)).toEqual([
          "attack",
          "0:BT26-059",
          "0:BT25-080",
          "0:BT24-098",
          "0:BT24-098",
          "0:BT26-059",
          "check",
        ]);
        expect(largestOrderPrompt(s, 0, firstDecision)).toBe(5);
        expect(permanentOf(s, 0, "BT25-080")).toBeDefined();
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
      }
    });
  });
});
