import { fixtureVariant } from "../scenario/references.js";
import fixtureLordknightmonKnightmon from "./lordknightmon-knightmon.fixture.js";
import fixtureExamonBattleWin from "./examon-battle-win.fixture.js";
import fixtureRegulusmonSharedOpt from "./regulusmon-shared-opt.fixture.js";
import fixtureMillenniummonSelfDelete from "./millenniummon-self-delete.fixture.js";
import fixtureOmnimonSourceCount from "./omnimon-source-count.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture, type ScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle, type SetupEngineOptions } from "../testkit/harness.js";

async function launch(id: ScenarioFixture, options: SetupEngineOptions = {}) {
  const s = setupEngine({ 0: {}, 1: {} }, options);
  layScenarioFixture(s.state, id, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const idle = () => settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  await idle();
  const finish = async () => {
    // Paying a large play cost legally passes the turn after the effect resolves.
    // Close the next breeding phase before surrender so the turn-loop waiter releases.
    if (s.state.phase === Phase.Breeding) {
      const seat = s.state.turnSeat;
      const ended = s.engine.applyIntent(seat, { type: "endPhase" });
      if (!ended.ok) throw new Error(`Could not end the next breeding phase: ${ended.reason}`);
      await advance(s.engine).waitForMainPhase(seat);
    }
    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  };
  return { s, idle, finish };
}

it.each(["hand", "trash"] as const)("arena: EX13 Knightmon is offered and played from %s", async (zone) => {
  const selected = fixtureVariant(
    { hand: fixtureInstanceId("knight-hand-card"), trash: fixtureInstanceId("knight-trash-card") },
    zone,
  );
  const { s, idle, finish } = await launch(fixtureLordknightmonKnightmon, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoChooseOption: true,
    preferInstanceIds: [selected],
    declinePrompts: ["1 of your [Knightmon] text Digimon may"],
  });
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: fixturePermanentId("own-lord-base"),
      instanceId: fixtureInstanceId("lord-card"),
      useAlternateCost: true,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === selected));
  await idle();
  const picker = s.decisions.find(({ req }) => req.sourceCardId === "EX13-064" && req.kind === "selectCards")!.req;
  expect(picker.options?.candidateInstanceIds).toEqual(
    expect.arrayContaining([fixtureInstanceId("knight-hand-card"), fixtureInstanceId("knight-trash-card")]),
  );
  expect(s.events).toContainEqual(
    expect.objectContaining({ kind: "cardPlayed", cardId: "EX13-058", instanceId: selected, fromZone: zone }),
  );
  expect(s.state.memory).toBe(7);
  await finish();
});

it.each(["hand", "sources", "slayerdramon"] as const)(
  "arena: Examon plays the selected Dracomon-text card (%s) after winning battle",
  async (zone) => {
    const selected =
      zone === "hand"
        ? fixtureInstanceId("wing-hand-card")
        : zone === "sources"
          ? fixtureInstanceId("own-source-examon-0-card")
          : fixtureInstanceId("slayer-hand-card");
    const { s, idle, finish } = await launch(fixtureExamonBattleWin, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: [selected],
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fixturePermanentId("own-examon"),
        target: { kind: "permanent", permanentId: fixturePermanentId("opponent-examon-victim") },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackEnded"));
    await settle(() => !observe(s.engine).isAttacking());
    await idle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === selected)).toBe(true);
    const picker = s.decisions.find(({ req }) => req.sourceCardId === "EX13-045" && req.kind === "selectCards")!.req;
    expect(picker.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([fixtureInstanceId("wing-hand-card"), fixtureInstanceId("own-source-examon-0-card")]),
    );
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-013")).toBe(true);
    expect(s.state.memory).toBe(5);
    await finish();
  },
);

it("arena: Regulusmon shares one paid activation between digivolving and attacking", async () => {
  const { s, idle, finish } = await launch(fixtureRegulusmonSharedOpt, {
    autoAcceptOptional: true,
    autoSelectCards: true,
  });
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: fixturePermanentId("own-regulus-base"),
      instanceId: fixtureInstanceId("regulus-card"),
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT10-094"));
  await idle();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: fixturePermanentId("own-regulus-base"),
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "attackEnded"));
  await settle(() => !observe(s.engine).isAttacking());
  await idle();
  expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT10-094")).toHaveLength(1);
  expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT10-094")).toHaveLength(1);
  await finish();
});

it("arena: Millenniummon can select and delete itself after De-Digivolve", async () => {
  const { s, idle, finish } = await launch(fixtureMillenniummonSelfDelete, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    preferInstanceIds: [fixtureInstanceId("millennium-card")],
  });
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("millennium-card") })).toEqual({
    ok: true,
  });
  await settle(() =>
    s.state.players[0]!.trash.some((card) => card.instanceId === fixtureInstanceId("millennium-card")),
  );
  await idle();
  const deletion = s.decisions.filter(({ req }) => req.kind === "chooseTargets").at(-1)!.req;
  expect(deletion.options?.candidateInstanceIds).toHaveLength(2);
  expect(s.state.players[0]!.battleArea).toHaveLength(0);
  expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-010");
  await finish();
});

it("arena: Omnimon bottom-decks the zero-source card and separately deletes the three-source Gallantmon", async () => {
  const { s, idle, finish } = await launch(fixtureOmnimonSourceCount, {
    autoAcceptOptional: true,
    autoSelectCards: true,
  });
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("omnimon-card") })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[1]!.battleArea.length === 0);
  await idle();
  const opponent = s.state.players[1]!;
  expect(opponent.deck.some((card) => card.instanceId === fixtureInstanceId("opponent-card-bottom-deck-card"))).toBe(
    true,
  );
  expect(opponent.deck.some((card) => card.instanceId === fixtureInstanceId("opponent-card-gallant-card"))).toBe(false);
  expect(opponent.trash.some((card) => card.instanceId === fixtureInstanceId("opponent-card-gallant-card"))).toBe(true);
  await finish();
});
