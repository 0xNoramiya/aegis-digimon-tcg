import { test, expect, type DecisionPolicy } from "./scenario-page";

const RIE = "dev-perm-0-feedback40-rie";
const PAYMENT = "dev-field-0-feedback40-payment";
const LORDKNIGHTMON = ["dev-feedback40-lordknightmon-0", "dev-feedback40-lordknightmon-1"];

// Feedback #40 (match 4d17a450): with 5 security cards, Rie Kishibe's [End of Your Turn] effect
// may still delete its payment, but EX13-064's [Rie Kishibe] digivolution requirement needs 3 or
// fewer security cards (Q4959). Rie must stay a Tamer and both LordKnightmon stay in hand.
test("feedback #40: Rie Kishibe pays its By cost but cannot digivolve with 5 security", async ({ scenario }) => {
  const { page } = scenario;
  await scenario.open("arena-feedback40-rie-kishibe-security-gate");
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  expect((await scenario.snapshot()).players[0]!.security).toHaveLength(5);

  const riePrompts: string[] = [];
  const answerRie: DecisionPolicy = (decision) => {
    if (decision.sourceCardId === "BT22-090") riePrompts.push(decision.kind);
    if (decision.kind === "chooseTargets") return { cardId: "BT22-083" };
    return { accept: true };
  };
  await page.getByRole("button", { name: /^End turn$/i }).click();
  await scenario.resolveUntil((s) => s.turnSeat === 1 && !s.pendingDecision, answerRie);

  const after = await scenario.snapshot();
  const human = after.players[0]!;
  expect(riePrompts[0]).toBe("optional");
  expect(human.trash.some((card) => card.instanceId === PAYMENT)).toBe(true);
  const rie = human.battleArea.find((permanent) => permanent.permanentId === RIE);
  expect(rie?.topCard.cardId).toBe("BT22-090");
  expect(human.hand.filter((card) => LORDKNIGHTMON.includes(card.instanceId))).toHaveLength(2);
  await scenario.healthy();
});
