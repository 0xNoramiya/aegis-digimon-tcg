import fixtureRieKishibeSecurityGate from "../../api/src/engine/scenarios/rie-kishibe-security-gate.fixture";
import fixtureBt22RieKishibeLegalDigivolve from "../../api/src/engine/scenarios/bt22-rie-kishibe-legal-digivolve.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect, type DecisionPolicy } from "./scenario-page";

const RIE = fixturePermanentId("own-rie");
const PAYMENT = fixtureInstanceId("own-card-payment-card");
const LORDKNIGHTMON = [fixtureInstanceId("lordknightmon-0-card"), fixtureInstanceId("lordknightmon-1-card")];

function answerRie(riePrompts: string[]): DecisionPolicy {
  return (decision) => {
    if (decision.sourceCardId === "BT22-090") riePrompts.push(decision.promptText);
    if (decision.kind === "chooseTargets") return { cardId: "BT22-083" };
    return { accept: !/Attack/.test(decision.promptText), cardId: "EX13-064" };
  };
}

// Feedback #40 (match 4d17a450): with 5 security cards, Rie Kishibe's [End of Your Turn] effect
// may still delete its payment, but EX13-064's [Rie Kishibe] digivolution requirement needs 3 or
// fewer security cards (Q4959). Rie must stay a Tamer and both LordKnightmon stay in hand. No
// "Digivolve" yes/no may appear, because accepting it could do nothing.
test("Rie Kishibe pays its By cost but cannot digivolve with 5 security", async ({ scenario }) => {
  const { page } = scenario;
  await scenario.openFixture(fixtureRieKishibeSecurityGate);
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  expect((await scenario.snapshot()).players[0]!.security).toHaveLength(5);

  const riePrompts: string[] = [];
  await page.getByRole("button", { name: /^End turn$/i }).click();
  await scenario.resolveUntil((s) => s.turnSeat === 1 && !s.pendingDecision, answerRie(riePrompts));

  const after = await scenario.snapshot();
  const human = after.players[0]!;
  expect(riePrompts.length).toBeGreaterThan(0);
  expect(riePrompts[0]).toMatch(/^Pay cost: By deleting/);
  expect(riePrompts).not.toContain("Digivolve");
  expect(human.trash.some((card) => card.instanceId === PAYMENT)).toBe(true);
  const rie = human.battleArea.find((permanent) => permanent.permanentId === RIE);
  expect(rie?.topCard.cardId).toBe("BT22-090");
  expect(human.hand.filter((card) => LORDKNIGHTMON.includes(card.instanceId))).toHaveLength(2);
  await scenario.healthy();
});

test("Rie Kishibe asks Digivolve and evolves with 3 security", async ({ scenario }) => {
  const { page } = scenario;
  await scenario.openFixture(fixtureBt22RieKishibeLegalDigivolve);
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  expect((await scenario.snapshot()).players[0]!.security).toHaveLength(3);

  const riePrompts: string[] = [];
  await page.getByRole("button", { name: /^End turn$/i }).click();
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX13-064") && !s.pendingDecision,
    answerRie(riePrompts),
  );

  const human = (await scenario.snapshot()).players[0]!;
  expect(riePrompts).toContain("Digivolve");
  expect(human.trash.some((card) => card.cardId === "BT22-083")).toBe(true);
  expect(human.hand.some((card) => card.cardId === "EX13-064")).toBe(false);
  await scenario.healthy();
});
