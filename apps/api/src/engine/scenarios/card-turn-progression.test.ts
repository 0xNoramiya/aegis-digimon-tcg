import { fixtureZoneId } from "../scenario/references.js";
import { fixtureVariant } from "../scenario/references.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import type { ScenarioFixture } from "../scenario/types.js";
import fixtureEggBreeding from "./egg-breeding.fixture.js";
import fixtureTargetmonAssembly from "./targetmon-assembly.fixture.js";
import fixturePatamonAngemon from "./patamon-angemon.fixture.js";
import fixtureDedigiMain from "./dedigi-main.fixture.js";
import fixtureKnightmonAura from "./knightmon-aura.fixture.js";
import fixtureMaterialSave from "./material-save.fixture.js";
import fixtureCraniamonSuspend from "./craniamon-suspend.fixture.js";
import fixtureKakkinmonOpponentEnd from "./kakkinmon-opponent-end.fixture.js";
import fixtureKakkinmonOpponentEndEx13062Bt1009 from "./kakkinmon-opponent-end-ex13-062-bt1-009.fixture.js";
import fixturePsychemonAssembly from "./psychemon-assembly.fixture.js";
import fixturePsychemonDigixros from "./psychemon-digixros.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";

import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle, type SetupEngineOptions } from "../testkit/harness.js";

async function launch(id: ScenarioFixture, options: SetupEngineOptions = {}) {
  const s = setupEngine({ 0: {}, 1: {} }, options);
  layScenarioFixture(s.state, id, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  if (id !== fixtureEggBreeding) {
    const result = s.engine.applyIntent(0, { type: "endPhase" });
    if (!result.ok) throw new Error(result.reason);
  }
  await advance(s.engine).waitForMainPhase(0);
  const idle = () => settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  const field = (index: number, seat: 0 | 1 = 0) =>
    s.state.players[seat]!.battleArea.find((p) => p.permanentId === fixtureZoneId(id, seat, "field", index))!;
  const hand = (index: number, seat: 0 | 1 = 0) => fixtureZoneId(id, seat, "hand", index);
  const finish = async () => {
    if (s.state.phase === Phase.Breeding) {
      const result = s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      if (!result.ok) throw new Error(result.reason);
      await advance(s.engine).waitForMainPhase(s.state.turnSeat);
    }
    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  };
  return { s, id, idle, field, hand, finish };
}

it("Targetmon counts as Sukamon for the full trash Assembly recipe and cost 3", async () => {
  const { s, id, hand, idle, finish } = await launch(fixtureTargetmonAssembly, {
    autoDeclineOptional: true,
  });
  const ids = [0, 1, 2].map((i) => fixtureZoneId(id, 0, "trash", i));
  expect(
    s.engine.applyIntent(0, { type: "playCard", instanceId: hand(0), assembly: { materialInstanceIds: ids } }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX13-031"));
  await idle();
  const king = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX13-031")!;
  expect(king.stack.map((c) => c.instanceId)).toEqual(ids.toReversed());
  expect(s.state.players[0]!.trash).toHaveLength(0);
  expect(s.state.memory).toBe(7);
  await finish();
});

it.each(["BT23-027", "BT25-034"])(
  "Patamon can evolve into face-down %s, replenish security and gain inherited memory",
  async (cardId) => {
    const { s, id, field, idle, finish } = await launch(fixturePatamonAngemon, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: [
        fixtureVariant(
          {
            "0": fixtureInstanceId("patamon-angemon-0-security-0-card"),
            "1": fixtureInstanceId("patamon-angemon-0-security-1-card"),
            "2": fixtureInstanceId("patamon-angemon-0-security-2-card"),
          },
          cardId === "BT23-027" ? 0 : 1,
        ),
        fixtureInstanceId("patamon-angemon-0-hand-0-card"),
      ],
    });
    await idle();
    expect(field(0).topCard.cardId).toBe(cardId);
    expect(field(0).stack.map((c) => c.cardId)).toContain("BT14-033");
    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(fixtureZoneId(id, 0, "hand", 0));
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(10); // Gain 1 is capped at the gauge's upper limit.
    expect(s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT14-033" && e.isInherited)).toBe(
      true,
    );
    await finish();
  },
);

it("De-Digivolve exposes Dracomon X and both restored start-of-main effects resolve next turn", async () => {
  const config: SetupEngineOptions = { autoDeclineOptional: true, autoSelectCards: true };
  const { s, field, hand, finish } = await launch(fixtureDedigiMain, config);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: hand(0, 1), useAs: "option" })).toEqual({
    ok: true,
  });
  await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
  expect(field(0).topCard.cardId).toBe("BT21-046");
  config.autoDeclineOptional = false;
  config.autoAcceptOptional = true;
  const before = s.state.memory;
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  await settle(
    () =>
      field(0).topCard.cardId === "EX13-018" &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(
    s.events.some(
      (e) => e.kind === "effectResolved" && e.sourceCardId === "BT21-046" && e.timing === "OnStartMainPhase",
    ),
  ).toBe(true);
  expect(s.state.memory).toBe(before + 2);
  await finish();
});

it("live Knightmon aura grants DarkKnightmon Reboot and Blocker on the opponent's turn only", async () => {
  const { s, field, finish } = await launch(fixtureKnightmonAura, { autoDeclineOptional: true });
  expect(observe(s.engine).hasKeyword(field(1), "Reboot")).toBe(false);
  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: field(1).permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(field(1).isSuspended).toBe(true);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(observe(s.engine).hasKeyword(field(1), "Reboot")).toBe(true);
  expect(observe(s.engine).hasKeyword(field(1), "Blocker")).toBe(true);
  expect(field(1).isSuspended).toBe(false);
  expect(observe(s.engine).hasKeyword(field(2), "Blocker")).toBe(false);
  expect(field(2).isSuspended).toBe(false); // Our Active phase already unsuspended it.
  await finish();
});

it("Material Save accepts SkullKnightmon source and makes it available to DarkKnightmon's On Deletion", async () => {
  const { s, field, id, finish } = await launch(fixtureMaterialSave, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    preferInstanceIds: [fixtureInstanceId("material-save-0-source-0-0-card")],
  });
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: field(0).permanentId,
      target: { kind: "permanent", permanentId: field(0, 1).permanentId },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  const skull = fixtureZoneId(id, 0, "source", 0, 0);
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === skull)).toBe(true);
  expect(
    s.decisions.find((d) => d.req.promptText.startsWith("＜Material Save 1＞"))?.req.options?.candidateInstanceIds,
  ).toContain(skull);
  await finish();
});

it("Craniamon's attack suspension deletes all tied lowest-play-cost Digimon", async () => {
  const { s, field, finish } = await launch(fixtureCraniamonSuspend, {
    autoAcceptOptional: true,
    autoSelectCards: true,
  });
  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: field(0).permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT1-084"]);
  expect(s.state.players[1]!.trash.filter((c) => c.cardId === "BT1-009")).toHaveLength(2);
  await finish();
});

it.each([fixtureKakkinmonOpponentEnd, fixtureKakkinmonOpponentEndEx13062Bt1009] as const)(
  "%s: Kakkinmon suspends the blocker at the end of the opponent's turn and Craniamon sweeps",
  async (id) => {
    const config: SetupEngineOptions = { autoDeclineOptional: true, autoSelectCards: true };
    const { s, field, finish } = await launch(id, config);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const before = s.state.players[0]!.hand.length;
    // Decline our end-of-turn opportunity, then accept the independent opponent-turn opportunity.
    config.autoDeclineOptional = false;
    config.autoAcceptOptional = true;
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
    expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "P-245")).toHaveLength(1);
    expect(s.state.players[0]!.hand.length).toBe(before + 2); // Kakkinmon draw, then turn draw.
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT1-084"]);
    expect(field(0)).toBeDefined();
    await finish();
  },
);

it.each([fixturePsychemonAssembly, fixturePsychemonDigixros] as const)(
  "Psychemon permits material placement but prohibits the %s discount",
  async (id) => {
    const { s, hand, idle, finish } = await launch(id, { autoDeclineOptional: true });
    const assembly = id.name?.endsWith("assembly");
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: hand(0),
        ...(assembly
          ? { assembly: { materialInstanceIds: [0, 1, 2].map((i) => fixtureZoneId(id, 0, "trash", i)) } }
          : { digiXros: { materialInstanceIds: [hand(1), hand(2)] } }),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await idle();
    expect(s.state.memory).toBe(assembly ? 3 : 2);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(assembly ? 3 : 2);
    await finish();
  },
);

it("Dracomon X's printed egg evolution costs 1 without activating Bebydomon in breeding", async () => {
  const { s, hand, id, finish } = await launch(fixtureEggBreeding, { autoDeclineOptional: true });
  const egg = s.state.players[0]!.breeding!;
  expect(s.engine.applyIntent(0, { type: "digivolve", instanceId: hand(0), permanentId: egg.permanentId })).toEqual({
    ok: true,
  });
  await settle(
    () =>
      egg.topCard.cardId === "BT21-046" &&
      s.state.players[0]!.hand.some((c) => c.cardId === "BT1-009") &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(s.state.memory).toBe(9);
  expect(s.events.some((e) => e.kind === "effectTriggered" && e.sourceCardId === "EX13-005")).toBe(false);
  expect(egg.stack[0]?.instanceId).toBe(fixtureInstanceId("egg-breeding-0-field-0-card"));
  await finish();
});

it.each([
  ["EX13-062", ["BT13-070", "BT13-068", "BT13-061"]],
  ["BT26-081", ["BT24-041"]],
] as const)(
  "a prohibited Assembly discount cannot make %s affordable (production Mervamon repro)",
  async (cardId, sources) => {
    const s = setupEngine({
      0: { hand: [{ card: cardId, as: "played" }], trash: [...sources] },
      1: { battleArea: ["BT8-071"] },
    });
    s.state.memory = 0;
    await s.ready();
    const materials = s.state.players[0]!.trash.map((c) => c.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("played").instanceId,
        assembly: { materialInstanceIds: materials },
      }),
    ).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual(materials);
    expect(s.state.memory).toBe(0);
  },
);

it("deleting Psychemon clears the authoritative prohibition and restores Assembly's discount", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-016", as: "attacker" }],
        hand: [{ card: "EX13-031", as: "king" }],
        trash: ["EX13-028", "EX13-028", "EX5-046"],
      },
      1: { battleArea: [{ card: "BT8-071", as: "psyche", suspended: true }] },
    },
    { autoDeclineOptional: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.inst("king").playCostReductionBlocked).toBe(true);
  expect(s.inst("king").projectedPlayCost).toBe(7);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("psyche").permanentId },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.inst("king").playCostReductionBlocked).toBe(false);
  const materials = s.state.players[0]!.trash.map((c) => c.instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("king").instanceId,
      assembly: { materialInstanceIds: materials },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX13-031") &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(s.state.memory).toBe(7);
});
