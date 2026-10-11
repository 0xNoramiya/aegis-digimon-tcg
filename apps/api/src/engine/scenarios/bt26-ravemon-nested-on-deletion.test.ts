import fixtureBt26RavemonNestedOnDeletion from "./bt26-ravemon-nested-on-deletion.fixture.js";
import { fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("BT26 Ravemon nested On Deletion arena scenario", () => {
  it("resolves every On Deletion as soon as a Thomas-reduced Crowmon ends in Ravemon deleting itself", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: [fixtureInstanceId("own-card-ravemon-yoshino-card")],
        declinePrompts: ["Place 1 card(s) from hand"],
      },
    );
    layScenarioFixture(s.state, fixtureBt26RavemonNestedOnDeletion, [BLUE_DECK, RED_DECK], true);
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    const thomas = () =>
      human.battleArea.find(({ permanentId }) => permanentId === fixturePermanentId("own-ravemon-thomas"));

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fixturePermanentId("own-ravemon-declared-peckmon"),
        instanceId: fixtureInstanceId("ravemon-crowmon-card"),
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.security.some(({ instanceId }) => instanceId === fixtureInstanceId("ravemon-trash-card")) &&
        s.state.pendingDecision === undefined,
      2000,
    );

    expect(s.events.find(({ kind }) => kind === "digivolved")).toMatchObject({
      permanentId: fixturePermanentId("own-ravemon-declared-peckmon"),
      cardId: "BT26-076",
    });
    expect(bot.battleArea).toHaveLength(0);
    expect(bot.hand).toHaveLength(1);
    expect(thomas()?.stack).toHaveLength(1);
    expect(human.security.at(-1)).toMatchObject({ instanceId: fixtureInstanceId("ravemon-trash-card"), faceUp: true });

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
