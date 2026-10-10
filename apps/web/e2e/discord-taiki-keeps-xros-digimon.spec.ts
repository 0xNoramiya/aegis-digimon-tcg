import { test, expect } from "./scenario-page";

const PLAYED_TAIKI = "dev-taiki-bt10";
const REVEALED_TAIKI = "dev-taiki-reveal-taiki";
const KOTONE = "dev-taiki-reveal-kotone";
const SHOUTMON_X7 = "dev-taiki-reveal-x7";

// Discord 1558457266485731358. Q3113: BT10-087 must add to hand and place under as much as
// possible, so the only Xros Heart Digimon stays out of the hand choice.
test("Discord 1558457266485731358: BT10 Taiki keeps the only Xros Heart Digimon to place under", async ({
  scenario,
  page,
}) => {
  await scenario.open("arena-discord-taiki-keeps-xros-digimon");
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  await scenario.play("Taiki Kudo", "Tamer");

  const offered: string[][] = [];
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      s.players[0]!.battleArea.some((p) => p.topCard.instanceId === PLAYED_TAIKI && p.stack.length === 1),
    async (decision) => {
      if (decision.kind !== "selectCards" || decision.sourceCardId !== "BT10-087") return {};
      offered.push([...decision.options.candidateInstanceIds!]);
      if (offered.length === 1) {
        await expect(page.getByRole("dialog").locator(`[data-instance-id="${SHOUTMON_X7}"]`)).toBeDisabled();
        return { instanceId: KOTONE };
      }
      return { instanceId: SHOUTMON_X7 };
    },
  );

  expect(offered).toEqual([[REVEALED_TAIKI, KOTONE], [SHOUTMON_X7]]);
  const human = (await scenario.snapshot()).players[0]!;
  expect(human.hand.map((card) => card.instanceId)).toContain(KOTONE);
  expect(human.hand.map((card) => card.instanceId)).not.toContain(SHOUTMON_X7);
  const taiki = human.battleArea.find((p) => p.topCard.instanceId === PLAYED_TAIKI)!;
  expect(taiki.stack.map((card) => card.instanceId)).toEqual([SHOUTMON_X7]);
  await scenario.healthy();
});
