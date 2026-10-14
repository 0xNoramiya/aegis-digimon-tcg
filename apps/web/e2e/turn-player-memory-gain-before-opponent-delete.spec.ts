import fixture from "../../api/src/engine/scenarios/turn-player-memory-gain-before-opponent-delete.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const MONZAEMON_ID = fixturePermanentId("mirage-monzaemon");
const MIRAGE_GAOGAMON = fixtureInstanceId("mirage-gaogamon-card");

test("MirageGaogamon gains memory before the opponent's Ouryumon deletes it", async ({ scenario }) => {
  await scenario.openFixture(fixture);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  expect((await scenario.snapshot()).memory).toBe(4);
  await scenario.evolve("MirageGaogamon", MONZAEMON_ID);

  await scenario.resolveUntil((s) => !s.pendingDecision && s.players[0]!.battleArea.length === 0);

  const state = await scenario.snapshot();
  expect(state.players[1]!.handCount).toBe(4);
  expect(state.players[1]!.securityCount).toBe(3);
  expect(state.players[0]!.trash.map((card) => card.instanceId)).toContain(MIRAGE_GAOGAMON);
  expect(state.memory).toBe(1);
  await scenario.healthy();
});
