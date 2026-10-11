import fixtureEx6SanzomonNamedSearch from "../../api/src/engine/scenarios/ex6-sanzomon-named-search.fixture";
import { fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

test("Sanzomon searches only one of each named card", async ({ scenario, page }) => {
  test.setTimeout(120_000);
  // Card art is cosmetic; the remote mirror can return 502 independently of the rules regression.
  await page.route("**/assets/card-images/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP4/x8AAwAB//wl3FEAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await scenario.openFixture(fixtureEx6SanzomonNamedSearch);
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  await scenario.play("Sanzomon", "Digimon");
  const picker = page.getByRole("dialog", { name: "＜DigiXros＞ Sanzomon", exact: true });
  const material = picker.getByRole("button").filter({ has: page.getByRole("img", { name: "Gokuumon", exact: true }) });
  await material.click();
  await expect(picker.getByRole("button", { name: "DigiXros (1 card)", exact: true })).toBeEnabled();
  await picker.getByRole("button", { name: "DigiXros (1 card)", exact: true }).click();
  let searchDecisions = 0;
  await scenario.resolveUntil(
    (state) => state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "EX6-025") && !state.pendingDecision,
    (decision) => {
      if (decision.kind === "selectCards" && decision.options.visibleCards?.length === 4) {
        searchDecisions += 1;
        const candidates = decision.options.candidateInstanceIds!;
        expect(decision.options.min).toBe(1);
        expect(decision.options.max).toBe(1);
        expect(candidates).toEqual(
          searchDecisions === 1
            ? [fixtureInstanceId("sanzo-deck-1-card"), fixtureInstanceId("sanzo-deck-2-card")]
            : [fixtureInstanceId("sanzo-deck-3-card")],
        );
        // Agumon is revealed for context but can never be selected for addition to hand.
        expect(candidates).not.toContain(fixtureInstanceId("sanzo-deck-4-card"));
      }
      return {};
    },
  );
  const final = await scenario.snapshot();
  expect(searchDecisions).toBe(2);
  expect(final.memory).toBe(5);
  expect(final.turnSeat).toBe(0);
  expect(final.players[0]!.battleArea[0]!.stack.map((card) => card.instanceId)).toEqual([
    fixtureInstanceId("sanzo-hand-1-card"),
  ]);
  expect(final.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
    [
      fixtureInstanceId("sanzo-hand-2-card"),
      fixtureInstanceId("sanzo-hand-3-card"),
      fixtureInstanceId("sanzo-deck-0-card"),
      fixtureInstanceId("sanzo-deck-1-card"),
      fixtureInstanceId("sanzo-deck-3-card"),
    ].sort(),
  );
  expect(final.players[0]!.deckCount).toBe(3);
  expect(
    (await scenario.presentation()).events.filter(
      (event) => event.kind === "cardRevealed" && event.sourceCardId === "EX6-025",
    ),
  ).toHaveLength(4);
  await scenario.healthy();
});
