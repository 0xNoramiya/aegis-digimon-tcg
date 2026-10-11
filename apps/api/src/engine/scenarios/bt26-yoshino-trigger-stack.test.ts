import fixtureBt26YoshinoTriggerStack from "./bt26-yoshino-trigger-stack.fixture.js";
import { fixtureVariant, fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const yoshinos = ["paying", "second", "third"].map((suffix) =>
  fixtureVariant(
    {
      geogreymon: fixturePermanentId("own-yoshino-stack-geogreymon"),
      paying: fixturePermanentId("own-yoshino-stack-paying"),
      second: fixturePermanentId("own-yoshino-stack-second"),
      third: fixturePermanentId("own-yoshino-stack-third"),
    },
    suffix,
  ),
);

describe("BT26 Yoshino trigger stack arena scenario", () => {
  it("triggers each Yoshino once per event", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: [
          fixturePermanentId("opponent-yoshino-stack-first"),
          fixturePermanentId("own-yoshino-stack-paying"),
          fixturePermanentId("opponent-yoshino-stack-second"),
          fixturePermanentId("opponent-yoshino-stack-third"),
        ],
        declinePrompts: ["Place 1 card(s) from hand"],
      },
    );
    layScenarioFixture(s.state, fixtureBt26YoshinoTriggerStack, [BLUE_DECK, RED_DECK], true);
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fixturePermanentId("own-yoshino-stack-geogreymon"),
        instanceId: fixtureInstanceId("yoshino-stack-lilamon-card"),
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea.find(({ permanentId }) => permanentId === fixturePermanentId("own-yoshino-stack-geogreymon"))
          ?.topCard.cardId === "ST24-11" &&
        bot.battleArea.every(({ isSuspended }) => isSuspended) &&
        s.state.pendingDecision === undefined,
      4000,
    );

    const triggersOf = (permanentId: string, clause: string) =>
      s.events.filter(
        (event) =>
          event.kind === "effectTriggered" &&
          event.sourcePermanentId === permanentId &&
          event.effectKey.includes(clause),
      ).length;
    const suspendClause = "When any of your opponent's Digimon or Tamers suspend";
    const trashClause = "When effects trash cards from under this Tamer";

    // Six distinct suspended-event occurrences reach the ordering plans. Since
    // #5300 the suspension payment is its own choice, so each Yoshino activates
    // once by suspending itself and cannot pay again. Repeated order prompts
    // list a pending occurrence again, so count its unique key rather than prompts.
    const offeredKeys = [...new Set(s.decisions.flatMap(({ req }) => req.options?.triggerKeys ?? []))];
    const offersOf = (permanentId: string, clause: string) => {
      const instanceId = human.battleArea.find((p) => p.permanentId === permanentId)!.topCard.instanceId;
      return offeredKeys.filter((key) => key.startsWith(`${instanceId}::`) && key.includes(clause)).length;
    };
    expect(yoshinos.map((permanentId) => offersOf(permanentId, suspendClause))).toEqual([2, 2, 2]);
    expect(yoshinos.map((permanentId) => triggersOf(permanentId, suspendClause))).toEqual([1, 1, 1]);
    expect(yoshinos.map((permanentId) => offersOf(permanentId, trashClause))).toEqual([1, 0, 0]);
    expect(yoshinos.map((permanentId) => triggersOf(permanentId, trashClause))).toEqual([0, 0, 0]);
    expect(
      yoshinos.map((permanentId) => human.battleArea.find((p) => p.permanentId === permanentId)!.isSuspended),
    ).toEqual([true, true, true]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
