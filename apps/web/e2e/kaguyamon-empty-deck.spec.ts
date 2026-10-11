import fixtureKaguyamonEmptyDeck from "../../api/src/engine/scenarios/kaguyamon-empty-deck.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const KAGUYAMON = fixturePermanentId("own-kaguyamon");
const PRINCEMAMEMON = fixturePermanentId("opponent-princemamemon");
const MONODRAMON = fixtureInstanceId("opponent-card-monodramon-card");

// Kaguyamon's [On Deletion] places a card at the bottom of an empty deck. The owner's pending
// PrinceMamemon [On Deletion] then reveals that card, cannot play it, and trashes it.
test("Kaguyamon returns to an empty deck, then PrinceMamemon's reveal trashes the card", async ({ scenario }) => {
  await scenario.openFixture(fixtureKaguyamonEmptyDeck);
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  const before = await scenario.snapshot();
  expect(before.players[1]!.deckCount).toBe(0);

  await scenario.page.locator(`[data-drop="perm-you"][data-id="${KAGUYAMON}"]`).click();
  await scenario.page.getByRole("button", { name: "Attack", exact: true }).click();
  await scenario.page.locator(`[data-drop="perm-opp"][data-id="${PRINCEMAMEMON}"]`).click();
  await scenario.resolveUntil(
    (s) =>
      s.players[1]!.battleArea.length === 0 &&
      s.players[1]!.trash.some((card) => card.instanceId === MONODRAMON) &&
      !s.pendingDecision &&
      !s.combatWindow,
    () => ({ triggerCardId: "EX12-065" }),
  );

  const events = (await scenario.presentation()).events;
  const toDeckBottom = events.findIndex(
    (event) => event.kind === "cardsMoved" && event.to === "deckBottom" && event.instanceIds.includes(MONODRAMON),
  );
  const revealed = events.findIndex(
    (event) => event.kind === "cardRevealed" && event.seat === 1 && event.cardId === "BT1-009",
  );
  const trashed = events.findIndex(
    (event) => event.kind === "cardsMoved" && event.to === "trash" && event.instanceIds.includes(MONODRAMON),
  );
  expect(toDeckBottom).toBeGreaterThanOrEqual(0);
  expect(revealed).toBeGreaterThan(toDeckBottom);
  expect(trashed).toBeGreaterThan(revealed);

  const after = await scenario.snapshot();
  expect(after.players[1]!.deckCount).toBe(0);
  expect(after.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-009", "EX13-063"]);
  expect(after.players[0]!.trash.map((card) => card.cardId)).toContain("EX12-065");

  // Both clients saw Monodramon on the field before it went into the deck. The reveal's
  // faceUp flip there must not reach them as a patch for a ref they already dropped.
  await scenario.healthy();
});
