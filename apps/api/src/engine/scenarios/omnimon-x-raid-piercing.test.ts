import fixtureOmnimonXRaidPiercing from "./omnimon-x-raid-piercing.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers, type EngineSetup } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const OMNIMON = fixturePermanentId("own-omnimon");
const PLESIOMON = fixturePermanentId("opponent-plesiomon");
const MONODRAMON = fixturePermanentId("opponent-monodramon");
const PLESIOMON_CARD = fixtureInstanceId("opponent-card-plesiomon-card");
const MONODRAMON_CARD = fixtureInstanceId("opponent-card-monodramon-card");

type FirstTrigger = "raid" | "warGreymon";

function respond(s: EngineSetup, response: Record<string, unknown>): void {
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: response as never,
    }),
  ).toEqual({ ok: true });
}

async function attackWithOmnimon(first: FirstTrigger): Promise<EngineSetup> {
  const s = setupEngine({ 0: {}, 1: {} }, { autoOrderTriggers: false });
  layScenarioFixture(s.state, fixtureOmnimonXRaidPiercing, [BLUE_DECK, RED_DECK], true);
  s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: OMNIMON, target: { kind: "player" } })).toEqual(
    { ok: true },
  );

  // Raid and WarGreymon's inherited [When Attacking] delete trigger together; the player orders them.
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const { triggerKeys } = JSON.parse(s.state.pendingDecision!.payloadJson) as { triggerKeys: string[] };
  const raidKey = triggerKeys.find((key) => key.includes("/keyword/Raid"));
  const warGreymonKey = triggerKeys.find((key) => key !== raidKey);
  expect(raidKey).toBeDefined();
  expect(warGreymonKey).toBeDefined();
  respond(s, { kind: "orderTriggers", order: [first === "raid" ? raidKey! : warGreymonKey!] });
  return s;
}

async function chooseDeleteTarget(s: EngineSetup, permanentId: string): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  expect(s.state.pendingDecision!.promptText).toBe("WarGreymon");
  respond(s, { kind: "chooseTargets", instanceIds: [permanentId] });
}

async function acceptRaid(s: EngineSetup, expectedCard: string): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const { candidateInstanceIds } = JSON.parse(s.state.pendingDecision!.payloadJson) as {
    candidateInstanceIds: string[];
  };
  expect(candidateInstanceIds).toEqual([expectedCard]);
  respond(s, { kind: "selectCards", instanceIds: [expectedCard] });
}

async function attackEnded(s: EngineSetup): Promise<void> {
  await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
}

/** The bot's Digimon from the layout; a checked Tai Kamiya (BT1-085) plays itself as a Tamer. */
function opponentDigimon(s: EngineSetup): string[] {
  return s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId).filter((permanentId) =>
    permanentId.startsWith(fixturePermanentId("opponent-")),
  );
}

function piercingChecks(s: EngineSetup): number {
  return s.events.filter((event) => event.kind === "securityChecked").length;
}

describe("Omnimon (X Antibody) Raid and Piercing arena scenario", () => {
  it("Piercing checks security after Raid switches the target and the battle deletes it", async () => {
    const s = await attackWithOmnimon("raid");
    await acceptRaid(s, PLESIOMON_CARD);
    await chooseDeleteTarget(s, MONODRAMON);
    await attackEnded(s);

    expect(opponentDigimon(s)).toEqual([]);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(piercingChecks(s)).toBe(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([OMNIMON]);
  });

  it("Piercing checks security when the delete resolves first and Raid then picks the next target", async () => {
    const s = await attackWithOmnimon("warGreymon");
    await chooseDeleteTarget(s, PLESIOMON);
    await acceptRaid(s, MONODRAMON_CARD);
    await attackEnded(s);

    expect(opponentDigimon(s)).toEqual([]);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(piercingChecks(s)).toBe(1);
  });

  it("no Piercing when the [When Attacking] delete removes the Raid target before the battle (CR 11-2-6)", async () => {
    const s = await attackWithOmnimon("raid");
    await acceptRaid(s, PLESIOMON_CARD);
    await chooseDeleteTarget(s, PLESIOMON);
    await attackEnded(s);

    // The deleted Raid target stays the attack target, so the attack fails without a battle.
    expect(opponentDigimon(s)).toEqual([MONODRAMON]);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(piercingChecks(s)).toBe(0);
  });
});
