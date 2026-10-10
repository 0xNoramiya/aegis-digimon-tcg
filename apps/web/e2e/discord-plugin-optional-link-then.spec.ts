import { test, expect, type DecisionPolicy } from "./scenario-page";

const AGUMON = "dev-perm-0-plugin-h-agumon";
const PLUG_IN = "ST22-09";

function answerLink(acceptLink: boolean, prompts: string[]): DecisionPolicy {
  return (decision) => {
    if (decision.sourceCardId === PLUG_IN && decision.kind === "optional") prompts.push(decision.promptText);
    return { accept: decision.promptText === "Link" ? acceptLink : true };
  };
}

// Discord 1558589221843771433: High-Speed Plug-In H (ST22-09) reads "You may link this card to
// 1 of your Digimon without paying the cost. Then, 1 of your opponent's Digimon or Tamers can't
// suspend until their turn ends." Only the link is optional. The "Then" part must resolve
// without a second yes/no, whether the player declines or accepts the link.
test("Discord plug-in: the Then part resolves with or without the optional link", async ({ scenario }) => {
  const { page } = scenario;
  await scenario.open("arena-plugin-high-speed-optional-link");
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);

  const prompts: string[] = [];
  for (const [index, acceptLink] of [false, true].entries()) {
    const plugInCard = page.getByTestId("hand").getByRole("button", { name: "Select High-Speed Plug-In H", exact: true });
    await plugInCard.first().focus();
    await plugInCard.first().press("Enter");
    await page.getByRole("button", { name: "Play Option", exact: true }).click();
    await scenario.resolveUntil(
      (s) => !s.pendingDecision && s.players[0]!.hand.filter((card) => card.cardId === PLUG_IN).length === 1 - index,
      answerLink(acceptLink, prompts),
    );
    const human = (await scenario.snapshot()).players[0]!;
    const agumon = human.battleArea.find((permanent) => permanent.permanentId === AGUMON);
    expect(agumon?.linked.filter((card) => card.cardId === PLUG_IN)).toHaveLength(acceptLink ? 1 : 0);
    expect(human.trash.filter((card) => card.cardId === PLUG_IN)).toHaveLength(1);
  }

  expect(prompts).toEqual(["Link", "Link"]);
  expect((await scenario.snapshot()).memory).toBe(1);
  await scenario.healthy();
});
