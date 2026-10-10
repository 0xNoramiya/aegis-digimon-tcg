import { test, expect } from "./scenario-page";

// CR 15-8-3-9-2: "if your hand has 4 or fewer cards" is a processing condition. LM-068's [Trash]
// effect triggers when Punkmon attacks with 5 cards in hand and activates once Punkmon's
// [When Attacking] has trashed the hand down to 3.
test("feedback #29: Black Sabbath is offered from the trash after Punkmon trashes the hand", async ({ scenario }) => {
  // Card art is cosmetic, and the local mirror has no LM-068 image.
  await scenario.page.route("**/assets/card-images/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP4/x8AAwAB//wl3FEAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await scenario.open("arena-feedback29-black-sabbath-trash");
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  const before = await scenario.snapshot();
  expect(before.players[0]!.hand).toHaveLength(5);
  expect(before.players[0]!.trash.map((card) => card.cardId)).toContain("LM-068");
  expect(before.memory).toBe(3);

  await scenario.attack("dev-perm-0-feedback29-punkmon");
  const offered: string[] = [];
  await scenario.resolveUntil(
    (s) =>
      s.players[1]!.battleArea.length === 0 &&
      s.players[1]!.securityCount === 3 &&
      !s.pendingDecision &&
      !s.combatWindow,
    (decision) => {
      if (decision.kind === "optional" && decision.sourceCardId) offered.push(decision.sourceCardId);
      return {};
    },
  );

  expect(offered).toContain("LM-068");
  const after = await scenario.snapshot();
  expect(after.players[0]!.hand).toHaveLength(3);
  expect(after.memory).toBe(0);
  expect(after.players[0]!.trash.map((card) => card.cardId)).toContain("LM-068");

  // Timing exception for this sequence only: an Option used from the trash by an effect stalls
  // the presentation until two gate ceilings expire (the Option dock waits on the deletion its
  // own clause causes). That is a client presentation defect, separate from this rules fix.
  const knownStalls = ["deleteBurst/causingEffect", "effectUnit/announced"];
  await scenario.idle();
  const probe = await scenario.presentation();
  expect(probe.pending).toBe(0);
  expect(probe.steps.filter((step) => step.failed)).toEqual([]);
  expect(probe.gateExpiries.filter((expiry) => !knownStalls.includes(expiry.label))).toEqual([]);
  expect(scenario.errors.filter((error) => !error.startsWith("[MATCH_CUE] gate expired"))).toEqual([]);
});
