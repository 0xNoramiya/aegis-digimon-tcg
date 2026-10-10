import { test, expect, type DecisionPolicy } from "./scenario-page";

const KYOKO = "dev-perm-0-bt22-101-kyoko";
const ALPHAMON = "dev-bt22-101-alphamon";

function answerKyoko(kyokoPrompts: string[]): DecisionPolicy {
  return (decision) => {
    if (decision.sourceCardId === "BT22-101") kyokoPrompts.push(decision.promptText);
    return { accept: true, cardId: "BT22-063" };
  };
}

// BT22-101 Kyoko Kuremi has no security condition of its own. BT22-063 Alphamon's [Kyoko Kuremi]
// requirement (3 or fewer security cards) is checked when her unsuspend effect activates
// (CR 15-8-3-7, Q4976). With 3 security cards, the unsuspend phase asks "Digivolve" and Kyoko
// becomes Alphamon for 3 memory.
test("BT22-101: Kyoko Kuremi digivolves into Alphamon when she unsuspends with 3 security", async ({ scenario }) => {
  await scenario.open("arena-bt22-101-kyoko-alphamon-on-unsuspend", "normal", "none");

  const kyokoPrompts: string[] = [];
  await scenario.resolveUntil(
    (s) =>
      s.phase === "Breeding" && !s.pendingDecision && s.players[0]!.battleArea.some((p) => p.permanentId === KYOKO),
    answerKyoko(kyokoPrompts),
  );

  const after = await scenario.snapshot();
  const human = after.players[0]!;
  expect(human.security).toHaveLength(3);
  expect(kyokoPrompts).toContain("Digivolve");
  const alphamon = human.battleArea.find((permanent) => permanent.permanentId === KYOKO);
  expect(alphamon?.topCard.cardId).toBe("BT22-063");
  expect(human.hand.some((card) => card.instanceId === ALPHAMON)).toBe(false);
  expect(after.memory).toBe(1);
  await scenario.healthy();
});
