import fixtureEx13MercifulModeAttackOrder from "./ex13-merciful-mode-attack-order.fixture.js";
import { fixtureVariant, fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { settleAcrossTimers, setupEngine, settle } from "../testkit/harness.js";

const MERCIFUL = fixtureInstanceId("merciful-hand-0-card");
const ASSEMBLY_MATERIALS = [10, 9, 8, 7, 5, 6].map((index) =>
  fixtureVariant(
    {
      "0": fixtureInstanceId("merciful-trash-0-0-card"),
      "1": fixtureInstanceId("merciful-trash-0-1-card"),
      "2": fixtureInstanceId("merciful-trash-0-2-card"),
      "3": fixtureInstanceId("merciful-trash-0-3-card"),
      "4": fixtureInstanceId("merciful-trash-0-4-card"),
      "5": fixtureInstanceId("merciful-trash-0-5-card"),
      "6": fixtureInstanceId("merciful-trash-0-6-card"),
      "7": fixtureInstanceId("merciful-trash-0-7-card"),
      "8": fixtureInstanceId("merciful-trash-0-8-card"),
      "9": fixtureInstanceId("merciful-trash-0-9-card"),
      "10": fixtureInstanceId("merciful-trash-0-10-card"),
      "11": fixtureInstanceId("merciful-trash-0-11-card"),
      "12": fixtureInstanceId("merciful-trash-0-12-card"),
      "13": fixtureInstanceId("merciful-trash-0-13-card"),
    },
    index,
  ),
);
const WHEN_ATTACKING_SOURCES = new Set(["AD1-004", "ST21-05", "AD1-014", "EX9-019"]);

describe("EX13-077 Omnimon: Merciful Mode arena scenario", () => {
  it("every activation resolves before When Attacking", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        autoSelectCards: true,
        preferOptionIndex: 0,
        preferInstanceIds: [MERCIFUL],
      },
    );
    layScenarioFixture(s.state, fixtureEx13MercifulModeAttackOrder, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    expect(human.hand).toHaveLength(7);
    expect(s.state.memory).toBe(3);
    const eventsBefore = s.events.length;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: MERCIFUL,
        assembly: { materialInstanceIds: ASSEMBLY_MATERIALS },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.slice(eventsBefore).some((event) => event.kind === "attackDeclared"));
    await settle(() => s.events.slice(eventsBefore).some((event) => event.kind === "alliancePrompt"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondAlliance",
        allyPermanentId: fixturePermanentId("own-merciful-skullgreymon"),
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.events.slice(eventsBefore).some((event) => event.kind === "blockWindowOpened"));

    const events = s.events.slice(eventsBefore);
    const attackDeclared = events.findIndex((event) => event.kind === "attackDeclared");
    const optionsChosen = events.flatMap((event, index) =>
      event.kind === "effectOptionChosen" && event.sourceCardId === "EX13-077" ? [index] : [],
    );
    const battleDeletions = events.flatMap((event, index) =>
      event.kind === "cardsMoved" && event.to === "trash" && index > attackDeclared ? [index] : [],
    );
    const firstWhenAttacking = events.findIndex(
      (event) => event.kind === "effectTriggered" && WHEN_ATTACKING_SOURCES.has(event.sourceCardId),
    );
    const blockWindow = events.findIndex((event) => event.kind === "blockWindowOpened");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(events[attackDeclared]).toMatchObject({ attackerCardId: "EX13-077", target: { kind: "player" } });
    // Seven colors give three activations; each Battle deletes one opposing Digimon.
    expect(optionsChosen).toHaveLength(3);
    expect(optionsChosen[0]!).toBeGreaterThan(attackDeclared);
    expect(battleDeletions[2]!).toBeGreaterThan(optionsChosen[2]!);
    expect(firstWhenAttacking).toBeGreaterThan(battleDeletions[2]!);
    expect(blockWindow).toBeGreaterThan(firstWhenAttacking);
  });
});
