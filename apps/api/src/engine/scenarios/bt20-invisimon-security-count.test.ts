import fixtureBt20InvisimonSecurityCount from "./bt20-invisimon-security-count.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { syncPublicCounts } from "../state/visibility.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("reveals security through Invisimon without changing either four-card stack", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoChooseOption: true });
  layScenarioFixture(s.state, fixtureBt20InvisimonSecurityCount, [BLUE_DECK, RED_DECK], true);
  s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const human = s.state.players[0]!;
  const opponent = s.state.players[1]!;
  const identities = s.state.players.map((player) => player.security.map((card) => card.instanceId));
  expect(human.security.map((card) => card.faceUp)).toEqual([true, false, false, false]);
  expect(human.security[0]!.cardId).toBe("BT20-017");
  expect(opponent.security.map((card) => card.faceUp)).toEqual([false, false, false, false]);
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: fixturePermanentId("own-invisimon-base"),
      instanceId: fixtureInstanceId("invisimon-count-hand-card"),
    }),
  ).toEqual({ ok: true });
  await settle(() => opponent.security[0]!.faceUp && s.state.pendingDecision === undefined);
  expect(opponent.security.map((card) => card.faceUp)).toEqual([true, false, false, false]);
  expect(s.state.players.map((player) => player.security.map((card) => card.instanceId))).toEqual(identities);
  syncPublicCounts(s.state);
  expect(s.state.players.map((player) => player.securityCount)).toEqual([4, 4]);
  expect(s.state.players.map((player) => player.securityView.map((card) => card.faceUp))).toEqual([
    [true, false, false, false],
    [true, false, false, false],
  ]);
  for (const player of s.state.players) {
    expect(player.securityView.filter((card) => !card.faceUp).map((card) => card.cardId)).toEqual(["", "", ""]);
  }
  expect(s.state.memory).toBe(0);
});
