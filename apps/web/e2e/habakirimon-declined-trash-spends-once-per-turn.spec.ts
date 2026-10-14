import fixture from "@api-fixtures/habakirimon-declined-trash-spends-once-per-turn.fixture";
import { test, expect, type ScenarioPage } from "@e2e/scenario-page";
import { stubCardArtwork } from "@e2e/card-artwork";

const trashPrompt = "Trash the top security card of 1 player with the most security cards?";

test.use({ holdBotAfterTurn: 0 });
test.beforeEach(async ({ page }) => stubCardArtwork(page));

async function declineTrashThenAttack(scenario: ScenarioPage) {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);
  const hostId = refs.permanentId("yellowBase");
  const host = (s: Awaited<ReturnType<typeof scenario.snapshot>>) =>
    s.players[0]!.battleArea.find((permanent) => permanent.permanentId === hostId)!;

  await scenario.evolve("Habakirimon", hostId);
  const trashPrompts: string[] = [];
  await scenario.resolveUntil(
    (s) => trashPrompts.length === 1 && host(s).topCard.cardId === "BT25-043" && !s.pendingDecision,
    (decision) => {
      expect(decision.promptText).toBe(trashPrompt);
      expect(decision.options.candidateInstanceIds).toEqual(["opponent"]);
      trashPrompts.push(decision.decisionId);
      return { accept: false };
    },
  );
  const afterDigivolve = await scenario.snapshot();
  expect(afterDigivolve.players[0]!.securityCount).toBe(3);
  expect(afterDigivolve.players[1]!.securityCount).toBe(4);
  expect(host(afterDigivolve).isSuspended).toBe(false);

  await scenario.attack(hostId);
  await scenario.resolveUntil(
    (s) => s.players[1]!.securityCount === 3 && !s.pendingDecision && !s.combatWindow,
    (decision) => {
      expect(decision.promptText).not.toBe(trashPrompt);
      return { accept: false };
    },
  );
  const afterAttack = await scenario.snapshot();
  expect(host(afterAttack).isSuspended).toBe(true);
  expect(afterAttack.players[0]!.securityCount).toBe(3);
  const habakirimonResolutions = (await scenario.presentation()).events.filter(
    (event) => event.kind === "effectResolved" && event.sourceCardId === "BT25-043",
  );
  expect(habakirimonResolutions.map((event) => (event as { timing?: string }).timing)).toEqual(["WhenDigivolving"]);
  await scenario.healthy();
}

test("Habakirimon's declined trash on digivolve leaves no [When Attacking] use that turn", async ({ scenario }) => {
  await declineTrashThenAttack(scenario);
});

test.describe("at phone width", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("Habakirimon's declined trash on digivolve leaves no [When Attacking] use that turn", async ({ scenario }) => {
    await declineTrashThenAttack(scenario);
  });
});
