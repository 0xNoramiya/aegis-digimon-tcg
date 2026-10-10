import { test, expect } from "./scenario-page";

const BT18_VEMMON = "dev-vemmon-bt18";
const SNATCHMON = "dev-vemmon-reveal-snatchmon";
const XENO = "dev-vemmon-reveal-xeno";
const BT11_VEMMON = "dev-vemmon-reveal-bt11";

// Discord 1557855696114946230. Q2992: BT18-060 must add to hand and place a source as much as
// possible, so the only [Vemmon] in the reveal stays out of the hand choice.
test("Discord 1557855696114946230: BT18 Vemmon keeps the only [Vemmon] for the source", async ({ scenario, page }) => {
  await scenario.open("arena-discord-vemmon-add-or-place");
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  await scenario.play("Vemmon", "Digimon");

  const offered: string[][] = [];
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      s.players[0]!.battleArea.some((p) => p.topCard.instanceId === BT18_VEMMON && p.stack.length === 1),
    async (decision) => {
      if (decision.kind !== "selectCards" || decision.sourceCardId !== "BT18-060") return {};
      offered.push([...decision.options.candidateInstanceIds!]);
      if (offered.length === 1) {
        await expect(page.getByRole("dialog").locator(`[data-instance-id="${BT11_VEMMON}"]`)).toBeDisabled();
        return { instanceId: SNATCHMON };
      }
      return { instanceId: BT11_VEMMON };
    },
  );

  expect(offered).toEqual([[SNATCHMON, XENO], [BT11_VEMMON]]);
  const human = (await scenario.snapshot()).players[0]!;
  expect(human.hand.map((card) => card.instanceId)).toContain(SNATCHMON);
  expect(human.hand.map((card) => card.instanceId)).not.toContain(BT11_VEMMON);
  const host = human.battleArea.find((p) => p.topCard.instanceId === BT18_VEMMON)!;
  expect(host.stack.map((card) => card.instanceId)).toEqual([BT11_VEMMON]);
  await scenario.healthy();
});
