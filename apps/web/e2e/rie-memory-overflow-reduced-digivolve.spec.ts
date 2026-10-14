import fixture from "../../api/src/engine/scenarios/rie-memory-overflow-reduced-digivolve.fixture";
import { test, expect, type DecisionPolicy } from "./scenario-page";

test.use({ holdBotAfterTurn: 0 });

function answerRie(riePrompts: string[]): DecisionPolicy {
  return (decision) => {
    if (decision.sourceCardId === "BT22-090") riePrompts.push(decision.promptText);
    if (decision.kind === "chooseTargets") return { cardId: "BT22-083" };
    return { accept: !/Attack/.test(decision.promptText), cardId: "EX13-064" };
  };
}

test("Rie Kishibe digivolves for the reduced cost after the turn ends on a memory overflow", async ({
  scenario,
  page,
}) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && state.turnSeat === 0 && !state.pendingDecision);
  await expect(page.locator(".game-memory-gauge")).toHaveAttribute("aria-label", "Memory: +1");

  const riePrompts: string[] = [];
  await scenario.play("Monodramon", "Digimon");
  await scenario.resolveUntil(
    (state) =>
      state.turnSeat === 1 &&
      state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX13-064") &&
      !state.pendingDecision,
    answerRie(riePrompts),
  );

  const human = (await scenario.snapshot()).players[0]!;
  const rie = human.battleArea.find((permanent) => permanent.permanentId === refs.permanentId("rie"));
  expect(riePrompts).toContain("Digivolve");
  expect(rie?.topCard.instanceId).toBe(refs.instanceId("lordKnightmon"));
  expect(human.trash.some((card) => card.instanceId === refs.instanceId("payment"))).toBe(true);
  await expect(page.locator(".game-memory-gauge")).toHaveAttribute("aria-label", "Memory: -3");
  await scenario.healthy();
});
