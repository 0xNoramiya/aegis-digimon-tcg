import fixtureGuilmonXReveal from "./guilmon-x-reveal.fixture.js";
import fixtureKudamonMoving from "./kudamon-moving.fixture.js";
import fixtureChuumonInherited from "./chuumon-inherited.fixture.js";
import fixtureTsunomonInherited from "./tsunomon-inherited.fixture.js";
import fixtureUkkomonMoving from "./ukkomon-moving.fixture.js";
import fixtureYuukiEndTurn from "./yuuki-end-turn.fixture.js";
import fixtureRyugumonWatcher from "./ryugumon-watcher.fixture.js";
import fixtureWeregarurumonTarget from "./weregarurumon-target.fixture.js";
import fixtureCandlemonMain from "./candlemon-main.fixture.js";
import { Phase, type GameState } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture, type ScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../testkit/harness.js";

async function inScenario(
  id: ScenarioFixture,
  exercise: (s: EngineSetup) => Promise<void>,
  declinePrompts: string[] = [],
): Promise<void> {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, declinePrompts },
  );
  layScenarioFixture(s.state, id, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await exercise(s);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
}

function hand(state: GameState, cardId: string) {
  const instance = state.players[0]!.hand.find((card) => card.cardId === cardId);
  if (!instance) throw new Error(`Missing ${cardId}`);
  return instance;
}

it("arena resolves both Guilmon X reveal additions", async () => {
  await inScenario(fixtureGuilmonXReveal, async (s) => {
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s.state, "EX8-009").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "EX8-009") && !s.state.pendingDecision,
    );
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(expect.arrayContaining(["EX13-010", "BT9-109"]));
  });
});

it("arena moves Kudamon without a Tamer and completes reveal resolution", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true });
  layScenarioFixture(s.state, fixtureKudamonMoving, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(
      s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.state.players[0]!.breeding!.permanentId }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toContain("ST24-06");
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["EX13-026"]);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});

for (const [id, returned, inherited] of [
  [fixtureChuumonInherited, "EX5-045", "EX5-045"],
  [fixtureTsunomonInherited, "AD1-001", "ST21-01"],
] as const) {
  it(`${id.name} resolves inherited battle deletion through a public attack`, async () => {
    await inScenario(id, async (s) => {
      const host = s.state.players[0]!.battleArea[0]!;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: host.permanentId,
          target: { kind: "permanent", permanentId: s.state.players[1]!.battleArea[0]!.permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((e) => e.kind === "attackEnded") && !s.state.pendingDecision);
      expect(s.events).toContainEqual(expect.objectContaining({ kind: "effectResolved", sourceCardId: inherited }));
      const returnedCards =
        inherited === "EX5-045"
          ? s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)
          : s.state.players[0]!.hand.map((c) => c.cardId);
      expect(returnedCards).toContain(returned);
      const suspended =
        inherited === "EX5-045"
          ? s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === returned)?.isSuspended
          : true;
      expect(suspended).toBe(true);
    });
  });
}

it("arena resolves Ukkomon's own move watcher before Main", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true, declinePrompts: ["Hatch"] },
  );
  layScenarioFixture(s.state, fixtureUkkomonMoving, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(
      s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.state.players[0]!.breeding!.permanentId }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toContain("BT1-010");
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});

it("arena returns an eligible trash card at End of All Turns", async () => {
  await inScenario(
    fixtureYuukiEndTurn,
    async (s) => {
      await settle(
        () =>
          s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "EX11-069") &&
          !s.state.pendingDecision,
      );
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.engine.applyIntent(0, { type: "endPhase" }).ok);
      await settle(() => s.state.players[0]!.hand.some((c) => c.cardId === "EX11-050") && !s.state.pendingDecision);
      expect(s.state.players[0]!.hand.map((c) => c.cardId)).toContain("EX11-050");
      expect(
        s.decisions.find(
          ({ req }) =>
            req.sourceCardId === "EX11-069" &&
            req.kind === "selectCards" &&
            req.options?.visibleCards?.some((card) => card.cardId === "EX11-050"),
        )?.req.options?.candidateInstanceIds,
      ).toHaveLength(2);
      expect(s.state.players[0]!.battleArea[0]!.isSuspended).toBe(true);
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
    },
    ["Trash card"],
  );
});

it("arena fires Ryugumon's watcher after public play", async () => {
  await inScenario(fixtureRyugumonWatcher, async (s) => {
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s.state, "BT1-010").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "EX12-036") && !s.state.pendingDecision,
    );
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX12-036" && req.kind === "chooseTargets")).toBe(true);
  });
});

it("arena exposes WereGarurumon's legal opposing field targets", async () => {
  await inScenario(fixtureWeregarurumonTarget, async (s) => {
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s.state, "EX12-032").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "EX12-032") && !s.state.pendingDecision,
    );
    expect(
      s.decisions.find(({ req }) => req.sourceCardId === "EX12-032" && req.kind === "chooseTargets")?.req.options
        ?.candidateInstanceIds,
    ).toHaveLength(2);
  });
});

it("arena runs Candlemon's printed Start of Main security effect", async () => {
  await inScenario(fixtureCandlemonMain, async (s) => {
    expect(s.state.players[0]!.security.map((c) => c.cardId)).toContain("EX13-025");
    expect(s.state.players[0]!.trash.map((c) => c.cardId)).toContain("BT1-010");
    expect(s.state.memory).toBe(9);
  });
});
