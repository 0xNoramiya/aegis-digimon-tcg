import fixtureAd1GallantmonDeletionAttackOrder from "./ad1-gallantmon-deletion-attack-order.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

const WARGROWLMON = fixturePermanentId("own-ad1-gallantmon-wargrowlmon");
const GALLANTMON = fixtureInstanceId("ad1-gallantmon-hand-card");

describe("AD1-008 Gallantmon deletion attack order dev scenario", () => {
  it("orders the inherited deletion watcher with [When Attacking] ()", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        autoSelectCards: true,
        preferTriggerKeys: ["ir-7-0", "activation"],
      },
    );
    layScenarioFixture(s.state, fixtureAd1GallantmonDeletionAttackOrder, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const memoryBefore = s.state.memory;
    const eventsBefore = s.events.length;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: WARGROWLMON, instanceId: GALLANTMON })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
      5000,
    );

    const events = s.events.slice(eventsBefore);
    const digivolveCost = events.find((event) => event.kind === "memoryChanged" && event.reason === "digivolve");
    const orderWindow = s.decisions.find(
      ({ req }) => req.kind === "orderTriggers" && (req.options?.triggerCardIds ?? []).includes("ST7-05"),
    );
    const attackDeclared = events.findIndex((event) => event.kind === "attackDeclared");
    const whenAttackingResolved = events.findIndex(
      (event, index) =>
        index > attackDeclared && event.kind === "effectResolved" && event.effectKey === "AD1-008/ir-shared-0",
    );
    const watcherGains = events.flatMap((event, index) =>
      event.kind === "memoryChanged" && event.reason === "gainMemory" && event.to - event.from === 1 ? [index] : [],
    );
    const memoryAfter = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(orderWindow?.req.options?.triggerCardIds).toEqual(expect.arrayContaining(["ST7-05", "AD1-008"]));
    expect(whenAttackingResolved).toBeGreaterThan(attackDeclared);
    expect(watcherGains).toHaveLength(1);
    expect(watcherGains[0]!).toBeGreaterThan(whenAttackingResolved);
    expect(digivolveCost).toBeDefined();
    if (digivolveCost?.kind !== "memoryChanged") return;
    // The ST7-05 watcher gains 1 once; WarGrowlmon's inherited End of Attack gains 2.
    expect(memoryAfter).toBe(memoryBefore - (digivolveCost.from - digivolveCost.to) + 3);
  });
});
