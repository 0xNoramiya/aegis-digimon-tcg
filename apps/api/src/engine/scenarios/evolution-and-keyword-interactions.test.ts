import { fixtureVariant } from "../scenario/references.js";

import fixtureMobileInspection from "./mobile-inspection.fixture.js";
import fixtureJesmonGankoomonImmunity from "./jesmon-gankoomon-immunity.fixture.js";
import fixtureTsunomonJupitermon from "./tsunomon-jupitermon.fixture.js";
import fixtureTsunomonJupitermonZero from "./tsunomon-jupitermon-zero.fixture.js";
import fixtureCerberusmonAlphamon from "./cerberusmon-alphamon.fixture.js";
import fixturePatamonZero from "./patamon-zero.fixture.js";
import fixturePatamonOne from "./patamon-one.fixture.js";
import fixturePatamonMultiple from "./patamon-multiple.fixture.js";
import fixtureMococomonOncePerTurn from "./mococomon-once-per-turn.fixture.js";
import fixtureDigilabBreeding from "./digilab-breeding.fixture.js";
import fixtureFlyBulletHand from "./fly-bullet-hand.fixture.js";
import fixtureFlyBulletSources from "./fly-bullet-sources.fixture.js";
import fixtureAsuna from "./asuna.fixture.js";
import fixtureImageTrainingLm056Bt25083 from "./image-training-lm-056-bt25-083.fixture.js";
import fixtureBreathingTrainingLm062Bt25083 from "./breathing-training-lm-062-bt25-083.fixture.js";
import fixturePagumon from "./pagumon.fixture.js";
import fixtureGiantSlayerExecute from "./giant-slayer-execute.fixture.js";
import fixtureHolySuccession from "./holy-succession.fixture.js";
import fixtureRosemonBurst from "./rosemon-burst.fixture.js";
import fixtureYoshino from "./yoshino.fixture.js";
import fixtureEngage from "./engage.fixture.js";
import fixtureJesmon from "./jesmon.fixture.js";
import fixtureAlphamon from "./alphamon.fixture.js";
import fixtureDantemon from "./dantemon.fixture.js";
import fixtureBlockTiming from "./block-timing.fixture.js";
import fixtureMachinedramon from "./machinedramon.fixture.js";
import fixtureDrasilTurn from "./drasil-turn.fixture.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const scenarios = [
  fixtureMobileInspection,
  fixtureJesmonGankoomonImmunity,
  fixtureTsunomonJupitermon,
  fixtureTsunomonJupitermonZero,
  fixtureCerberusmonAlphamon,
  fixturePatamonZero,
  fixturePatamonOne,
  fixturePatamonMultiple,
  fixtureMococomonOncePerTurn,
  fixtureDigilabBreeding,
  fixtureFlyBulletHand,
  fixtureFlyBulletSources,
  fixtureAsuna,
  fixtureImageTrainingLm056Bt25083,
  fixtureBreathingTrainingLm062Bt25083,
  fixturePagumon,
  fixtureGiantSlayerExecute,
  fixtureHolySuccession,
  fixtureRosemonBurst,
  fixtureYoshino,
  fixtureMachinedramon,
  fixtureEngage,
  fixtureJesmon,
  fixtureAlphamon,
  fixtureDantemon,
  fixtureBlockTiming,
  fixtureDrasilTurn,
];

it("the arena forces Fragment during the first security check", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  layScenarioFixture(s.state, fixtureMachinedramon, [RED_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    if (s.state.phase === Phase.Breeding) s.engine.applyIntent(0, { type: "endPhase" });
    await advance(s.engine).waitForMainPhase(0);
    const chaos = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT12-072")!;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: chaos.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "attackDeclared"));
    await advance(s.engine).finishAttack();
    expect(s.events.some((e) => e.kind === "securityRevealed" && e.revealedCardId === "ST1-16")).toBe(true);
    expect(s.events.filter((e) => e.kind === "deletionPrevented" && e.keyword === "Fragment")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === chaos.permanentId)).toBe(true);
    expect(chaos.stack.some((c) => c.cardId === "EX12-059")).toBe(true);
    expect(chaos.stack).toHaveLength(4);
    expect(s.state.players[0]!.trash.map((c) => c.cardId)).toEqual(expect.arrayContaining(["EX12-054", "EX12-055"]));
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});

describe("Evolution and keyword interactions", () => {
  it.each(scenarios)("opens %s in the ordinary turn loop", async (scenario) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, scenario, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      const breedingResult =
        s.state.phase === Phase.Breeding ? s.engine.applyIntent(0, { type: "endPhase" }) : { ok: true };
      expect(breedingResult).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.turnSeat).toBe(0);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.state.players[0]!.hand.length + s.state.players[0]!.battleArea.length).toBeGreaterThan(0);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});

it("arena primes Drasil then plays Omnimon X after an opponent-turn block", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      declinePrompts: ["reduce the play cost by 4"],
    },
  );
  layScenarioFixture(s.state, fixtureDrasilTurn, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    if (s.state.phase === Phase.Breeding) s.engine.applyIntent(0, { type: "endPhase" });
    await advance(s.engine).waitForMainPhase(0);
    const dynas = s.state.players[0]!.hand.find((c) => c.cardId === "BT13-087")!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: dynas.instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT13-087") &&
        s.state.pendingDecision === undefined,
    );
    const priorDecisions = s.decisions.length;
    const etemon = s.state.players[0]!.hand.find((c) => c.cardId === "EX5-048")!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: etemon.instanceId })).toEqual({ ok: true });
    const omeka = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX11-053")!;
    await settle(() => s.engine.combat.hasOpenCounterWindow || s.engine.combat.hasOpenBlockWindow);
    if (s.engine.combat.hasOpenCounterWindow) s.engine.applyIntent(0, { type: "respondCounter" });
    await settle(() => s.engine.combat.hasOpenBlockWindow);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: omeka.permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).finishAttack();
    await settle(
      () =>
        s.events.some((e) => e.kind === "cardPlayed" && e.cardId === "BT20-102") &&
        s.state.pendingDecision === undefined,
    );
    expect(
      s.decisions.slice(priorDecisions).some(({ req }) => req.sourceCardId === "BT13-007" && req.kind === "optional"),
    ).toBe(false);
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});

it.each(["giant-slayer-execute", "holy-succession"] as const)(
  "%s arena keeps Destroy Mode after Execute without paying Holy Mode protection",
  async (variant) => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    layScenarioFixture(
      s.state,
      fixtureVariant(
        { "giant-slayer-execute": fixtureGiantSlayerExecute, "holy-succession": fixtureHolySuccession },
        variant,
      ),
      [RED_DECK, RED_DECK],
      true,
    );
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(0, { type: "endPhase" });
      await advance(s.engine).waitForMainPhase(0);
      const giant = s.state.players[0]!.hand.find((c) => c.cardId === "BT26-085")!;
      const materials = s.state.players[0]!.trash.filter((c) =>
        ["BT26-001", "BT26-009", "BT26-011", "BT26-015", "BT26-016"].includes(c.cardId),
      );
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: giant.instanceId,
          ...(variant === "holy-succession"
            ? { assembly: { materialInstanceIds: materials.map((c) => c.instanceId) } }
            : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((e) => e.kind === "attackDeclared"));
      await advance(s.engine).finishAttack();
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(1, { type: "endPhase" });
      await advance(s.engine).waitForMainPhase(1);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT26-060")).toBe(true);
      expect(s.state.players[0]!.security).toHaveLength(2);
      expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT26-016")).toBe(false);
    } finally {
      s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  },
);
