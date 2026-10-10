import { test, expect } from "./scenario-page";

// CR 15-6-1 and 15-8-3-9-2: "if your opponent has 10 or more cards in their trash" is a processing
// condition. BT24-078 triggers on the attack declaration with 9 cards and activates once
// EX10-046's inherited [When Attacking] has trashed the 10th card.
test("feedback #14: Creepymon (X Antibody) digivolves from the trash on the end-of-turn attack", async ({
  scenario,
}) => {
  await scenario.open("arena-feedback14-creepymon-x-end-turn");
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  const before = await scenario.snapshot();
  expect(before.players[1]!.trash).toHaveLength(9);
  expect(before.players[0]!.trash.map((card) => card.cardId)).toContain("BT24-078");

  await scenario.page.getByRole("button", { name: /^End turn$/i }).click();
  const offered: string[] = [];
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.battleArea[0]?.topCard.cardId === "BT24-078" &&
      s.players[1]!.securityCount === 3 &&
      !s.pendingDecision,
    (decision) => {
      if (decision.kind === "optional" && decision.sourceCardId) offered.push(decision.sourceCardId);
      // The order prompt arrives in the same batch as the attack declaration and EX10-046's
      // [When Attacking], which play back to back before it can show: the attack announcement
      // (~1.8 s), the effect announcement (~0.9 s) and the showcase of the opponent's revealed
      // deck card (2.5 s). That is ~5.5 s, so the default 6 s budget left no headroom.
      if (decision.kind === "orderTriggers") return { decisionBudgetMs: 8_000 };
      return {};
    },
  );

  expect(offered).toEqual(expect.arrayContaining(["EX10-009", "BT24-078"]));
  const after = await scenario.snapshot();
  const creepymon = after.players[0]!.battleArea[0]!;
  expect(creepymon.stack.map((card) => card.cardId)).toEqual(["EX10-046", "EX10-009"]);
  expect(after.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT24-078");
  await scenario.healthy();
});
