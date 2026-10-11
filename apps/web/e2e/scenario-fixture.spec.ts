import { test, expect } from "./scenario-page";
import { stubCardArtwork } from "./card-artwork";
import { invasionTitansDrawnOgreDiscard } from "../../api/src/engine/scenarios/invasion-titans-drawn-ogre-discard.fixture.js";

test.use({ botMainIntents: [{ type: "endPhase" }] });
test.beforeEach(async ({ page }) => stubCardArtwork(page));

test("a later opponent-turn fixture reaches the human's turn through the real room", async ({ scenario, page }) => {
  const fixture = invasionTitansDrawnOgreDiscard();
  fixture.turnCount = 6;
  fixture.turnSeat = 1;
  fixture.memory = 3;
  const refs = await scenario.openFixture(fixture);
  await page.getByRole("button", { name: /^end breeding$/i }).click();
  await scenario.resolveUntil((state) => state.turnSeat === 0 && state.phase === "Main" && !state.pendingDecision);
  const state = await scenario.snapshot();
  expect(state.turnCount).toBe(8);
  expect(state.players[0]!.hand.map((card) => card.instanceId)).toContain(refs.instanceId("invasion"));
  expect(state.players[1]!.deckCount).toBe(fixture.board[1]!.deck!.length - 1);
  await scenario.healthy();
});
