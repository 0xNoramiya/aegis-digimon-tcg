import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/BT9/BT9-112.js";
import "../../cards/ST9/ST9-04.js";
import "../../cards/ST9/ST9-09.js";
import "../../cards/ST14/ST14-09.js";
import "../../cards/BT18/BT18-073.js";
import "../../cards/BT1/BT1-092.js";

const DEATHXMON = "BT9-112";
const TYRANNOMON = "BT1-016";
const NUCLEAR_LASER = "BT1-092";
const SURVIVING_OPPONENT_DIGIMON = "BT9-078";

async function playDeathXmonForFree(hand: Array<{ card: string; as: string }>) {
  const session = setupEngine(
    {
      0: {
        battleArea: [{ card: TYRANNOMON, as: "redDigimon" }],
        hand: [{ card: DEATHXMON, as: "deathX" }, ...hand],
      },
      1: { battleArea: Array.from({ length: 7 }, () => ({ card: SURVIVING_OPPONENT_DIGIMON })) },
    },
    { autoSelectCards: true },
  );
  session.state.memory = 10;
  expect(session.engine.applyIntent(0, { type: "playCard", instanceId: session.inst("deathX").instanceId })).toEqual({
    ok: true,
  });
  await settle(
    () =>
      session.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === DEATHXMON) &&
      session.state.pendingDecision === undefined,
  );
  expect(session.state.memory).toBe(10);
  expect(session.state.players[1]!.battleArea).toHaveLength(7);
  return session;
}

describe("DeathXmon cost reduction applies only to playing DeathXmon itself", () => {
  it("charges the full play cost for the next Digimon played after DeathXmon", async () => {
    const session = await playDeathXmonForFree([{ card: TYRANNOMON, as: "next" }]);

    expect(session.engine.applyIntent(0, { type: "playCard", instanceId: session.inst("next").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        session.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === TYRANNOMON).length ===
        2,
    );

    expect(session.state.memory).toBe(6);
  });

  it("charges the full use cost for the next Option used after DeathXmon", async () => {
    const session = await playDeathXmonForFree([{ card: NUCLEAR_LASER, as: "option" }]);

    expect(session.engine.applyIntent(0, { type: "playCard", instanceId: session.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        session.state.players[0]!.trash.some((card) => card.cardId === NUCLEAR_LASER) &&
        session.state.pendingDecision === undefined,
    );

    expect(session.state.memory).toBe(7);
  });
});

async function costOfPlayingTyrannomonBeside(battleArea: Array<{ card: string }>, trashCount = 0) {
  const session = setupEngine(
    {
      0: {
        battleArea,
        hand: [{ card: TYRANNOMON, as: "next" }],
        trash: Array.from({ length: trashCount }, () => ({ card: "BT1-030" })),
      },
      1: { battleArea: [{ card: "BT1-030" }] },
    },
    { autoSelectCards: true },
  );
  await session.ready();
  session.state.memory = 10;
  await session.engine.recomputeContinuousEffects();
  expect(session.engine.applyIntent(0, { type: "playCard", instanceId: session.inst("next").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => session.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === TYRANNOMON));
  return 10 - session.state.memory;
}

describe("a resident Digimon's own play-cost reduction does not reach other cards", () => {
  it("ExVeemon and Stingmon meeting each other's condition", async () => {
    expect(await costOfPlayingTyrannomonBeside([{ card: "ST9-04" }, { card: "ST9-09" }])).toBe(4);
  });

  it("BeelStarmon with 20 cards in trash", async () => {
    expect(await costOfPlayingTyrannomonBeside([{ card: "ST14-09" }], 20)).toBe(4);
  });

  it("Machinedramon does not offer its Composite deletion cost", async () => {
    expect(await costOfPlayingTyrannomonBeside([{ card: "BT18-073" }])).toBe(4);
  });
});
