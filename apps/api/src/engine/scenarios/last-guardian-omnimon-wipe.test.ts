import fixtureBt20LastGuardianOmnimonWipe from "./bt20-last-guardian-omnimon-wipe.fixture.js";
import { fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("offers only the earlier Last Guardian's Delay against Omnimon (X Antibody)'s wipe", async () => {
  const preferInstanceIds = [
    fixtureInstanceId("own-card-last-guardian-survivor-card"),
    fixtureInstanceId("opponent-card-last-guardian-target-card"),
  ];
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
  );
  layScenarioFixture(s.state, fixtureBt20LastGuardianOmnimonWipe, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  s.state.memory = 6;
  const human = s.state.players[0]!;
  const bot = s.state.players[1]!;

  expect(
    s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("last-guardian-fresh-card") }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      human.battleArea.some(({ topCard }) => topCard.instanceId === fixtureInstanceId("last-guardian-fresh-card")) &&
      s.state.pendingDecision === undefined,
  );
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: fixturePermanentId("own-last-guardian-omnimon"),
      instanceId: fixtureInstanceId("last-guardian-omnimon-x-card"),
    }),
  ).toEqual({ ok: true });
  await settle(() => bot.battleArea.length === 0 && s.state.pendingDecision === undefined);

  const delayPrompts = s.decisions.filter(
    ({ req }) => req.kind === "optional" && req.promptText === "Prevent leaving the battle area?",
  );
  expect(delayPrompts.map(({ req }) => req.sourcePermanentId)).toEqual([
    fixturePermanentId("own-last-guardian-established"),
  ]);
  expect(
    human.trash.some(({ instanceId }) => instanceId === fixtureInstanceId("own-card-last-guardian-established-card")),
  ).toBe(true);
  expect(human.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
    [
      fixtureInstanceId("own-card-last-guardian-survivor-card"),
      fixtureInstanceId("last-guardian-fresh-card"),
      fixtureInstanceId("last-guardian-omnimon-x-card"),
    ].sort(),
  );
  expect(bot.deck.at(-1)?.instanceId).toBe(fixtureInstanceId("opponent-card-last-guardian-target-card"));
  expect(bot.trash.map(({ instanceId }) => instanceId)).toEqual([
    fixtureInstanceId("opponent-card-last-guardian-wiped-card"),
  ]);

  advance(s.engine).endMainPhaseIfOpen(0);
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
