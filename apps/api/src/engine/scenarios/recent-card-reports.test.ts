import fixtureWargrowlmonEvadedBlock from "./wargrowlmon-evaded-block.fixture.js";
import fixtureNeptunemonHolyCost from "./neptunemon-holy-cost.fixture.js";
import fixtureClimbmonPistmonPlay from "./climbmon-pistmon-play.fixture.js";
import fixtureSukamonOpponentCost from "./sukamon-opponent-cost.fixture.js";
import fixtureToropiamonVortexControl from "./toropiamon-vortex-control.fixture.js";
import fixtureTuwarmonOpponentBlocker from "./tuwarmon-opponent-blocker.fixture.js";
import fixtureChuuchuumonOpponentBlocker from "./chuuchuumon-opponent-blocker.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

async function arena(id: Parameters<typeof layScenarioFixture>[1], preferInstanceIds: string[] = []) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: id !== fixtureWargrowlmonEvadedBlock,
      preferInstanceIds,
      preferOptionIndex: id === fixtureWargrowlmonEvadedBlock ? undefined : 1,
      declinePrompts: ["return all"],
    },
  );
  layScenarioFixture(s.state, id, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}
async function close({ s, loop }: Awaited<ReturnType<typeof arena>>) {
  if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
  s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
  await loop;
}

it("Neptunemon evolves onto Aegiochusmon: Holy for the TS cost of 3", async () => {
  const game = await arena(fixtureNeptunemonHolyCost);
  const { s } = game;
  try {
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fixturePermanentId("own-report-neptune-base"),
        instanceId: fixtureInstanceId("report-neptune-hand-card"),
        useAlternateCost: true,
        alternateRequirementIndex: 2,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !s.state.pendingDecision);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT24-030");
  } finally {
    await close(game);
  }
});

it("Climbmon plays Pistmon and resolves both On Play branches at three security", async () => {
  const game = await arena(fixtureClimbmonPistmonPlay, [fixtureInstanceId("report-0-deck-1-card")]);
  const { s } = game;
  try {
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fixturePermanentId("own-report-climb-base"),
        instanceId: fixtureInstanceId("report-climb-hand-card"),
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT16-044") && !s.state.pendingDecision,
    );
    expect(s.state.memory).toBe(7);
    expect(s.state.players[1]!.battleArea[0]!.isSuspended).toBe(true);
    expect(s.events.some((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT16-044")).toBe(true);
  } finally {
    await close(game);
  }
});

it("/ Q7288: the inherited Sukamon prevention pays with an opposing Sukamon", async () => {
  const game = await arena(fixtureSukamonOpponentCost, [fixturePermanentId("opponent-report-sukamon-fodder")]);
  const { s } = game;
  try {
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: fixtureInstanceId("report-gaia-card") })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.trash.some((c) => c.instanceId === fixtureInstanceId("report-gaia-card")) &&
        !s.state.pendingDecision,
    );
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX13-015");
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "BT3-060")).toBe(true);
  } finally {
    await close(game);
  }
});

it("/ Q2872: Vortex attack suspension does not trigger Toropiamon's effect-suspension watcher", async () => {
  const game = await arena(fixtureToropiamonVortexControl);
  const { s } = game;
  try {
    expect(observe(s.engine).hasKeyword(s.state.players[0]!.battleArea[0]!, "Vortex")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-042");
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === fixtureInstanceId("report-hydra-card"))).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  } finally {
    await close(game);
  }
});

it.each([fixtureTuwarmonOpponentBlocker, fixtureChuuchuumonOpponentBlocker] as const)(
  "%s grants inherited Blocker only on the opponent turn",
  async (id) => {
    const game = await arena(id);
    const { s } = game;
    try {
      const host = s.state.players[0]!.battleArea[0]!;
      expect(observe(s.engine).hasKeyword(host, "Blocker")).toBe(false);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(observe(s.engine).hasKeyword(host, "Blocker")).toBe(true);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: fixturePermanentId("opponent-report-tuwarmon-attacker"),
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.combatWindow?.kind === "block");
      expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: host.permanentId })).toEqual({
        ok: true,
      });
      await advance(s.engine).finishAttack();
      expect(s.state.players[0]!.security).toHaveLength(5);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
    } finally {
      await close(game);
    }
  },
);

it("WarGrowlmon resolves End of Attack after a blocked battle is evaded", async () => {
  const game = await arena(fixtureWargrowlmonEvadedBlock);
  const { s } = game;
  try {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fixturePermanentId("own-report-war"),
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.combatWindow?.kind === "block");
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: fixturePermanentId("opponent-report-ulforce"),
      }),
    ).toEqual({
      ok: true,
    });
    const evading = () => s.state.combatWindow?.kind === "evade";
    for (let i = 0; i < 4 && !evading(); i++) {
      await settle(() => s.state.pendingDecision?.kind === "chooseOption" || s.state.combatWindow?.kind === "evade");
      if (evading()) break;
      const decision = s.state.pendingDecision!;
      const req = s.decisions.findLast((d) => d.req.decisionId === decision.decisionId)!.req;
      const choices = req.options?.choices ?? [];
      const unsuspend = choices.findIndex((c) => /^unsuspend/i.test(c));
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "chooseOption", optionIndex: unsuspend >= 0 ? unsuspend : 0 },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.state.combatWindow?.kind === "evade");
    expect(
      s.engine.applyIntent(1, {
        type: "respondEvade",
        permanentId: fixturePermanentId("opponent-report-ulforce"),
        accept: true,
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT17-080")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX13-023")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(5);
  } finally {
    await close(game);
  }
});
