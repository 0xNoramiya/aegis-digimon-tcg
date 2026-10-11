import fixtureKingDrasilAce from "./king-drasil-ace.fixture.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture, type ScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

async function start(id: ScenarioFixture) {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true });
  layScenarioFixture(s.state, id, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  const skipped = s.state.phase === Phase.Breeding ? s.engine.applyIntent(0, { type: "endPhase" }) : { ok: true };
  expect(skipped).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

it("arena: King Drasil absorbs Ouryuken ACE at start of Main without Overflow", async () => {
  const { s, loop } = await start(fixtureKingDrasilAce);
  const player = s.state.players[0]!;
  expect(player.battleArea).toHaveLength(0);
  expect(player.breeding!.stack.some((c) => c.cardId === "BT20-060")).toBe(true);
  expect(player.trash.some((c) => c.cardId === "BT13-111")).toBe(true);
  expect(s.events.filter((e) => e.kind === "memoryChanged" && e.reason === "overflow")).toHaveLength(0);
  expect(s.state.memory).toBe(5);
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
