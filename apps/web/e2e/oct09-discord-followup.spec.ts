import { test, expect } from "./scenario-page";

test("Discord 1557413340161253496: EX11-065 Close's Start of Main cost can be declined", async ({ scenario }) => {
  await scenario.open("arena-ex11-close-start-main-decline");
  let declined = false;
  await scenario.resolveUntil(
    (state) => declined && state.phase === "Main" && !state.pendingDecision,
    (decision) => {
      expect(decision).toMatchObject({ kind: "selectCards", sourceCardId: "EX11-065" });
      expect(decision.options).toMatchObject({
        candidateInstanceIds: ["dev-stack-0-close-decline-gotsumon-0"],
        min: 0,
      });
      declined = true;
      return { accept: false };
    },
  );
  const state = await scenario.snapshot();
  const human = state.players[0]!;
  expect(state.memory).toBe(3);
  expect(human.trash).toHaveLength(0);
  expect(human.battleArea.find((p) => p.permanentId === "dev-perm-0-close-decline-gotsumon")!.stack).toHaveLength(1);
  expect(human.breeding?.stack.map((card) => card.cardId)).toEqual(["EX8-005"]);
  await expect(scenario.page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  await scenario.healthy();
});

test("Discord 1558244573333954622: Reload Plug-In Q joins security face down", async ({ scenario }) => {
  await scenario.open("arena-p146-reload-plug-in-face-down", "normal", "none");
  const page = scenario.page;
  await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  await page.locator('[data-drop="perm-you"][data-id="dev-perm-0-reload-plug-in-host"]').click();
  await page.getByRole("button", { name: "Attack", exact: true }).click();
  await page.locator('[data-drop="perm-opp"][data-id="dev-perm-1-reload-plug-in-wall"]').click();
  await scenario.resolveUntil(
    (state) => state.players[0]!.securityView.length === 6 && !state.pendingDecision && !state.combatWindow,
    () => ({ accept: true }),
  );
  const human = (await scenario.snapshot()).players[0]!;
  expect(human.securityView.every((card) => card.faceUp !== true)).toBe(true);
  expect(human.battleArea.map((p) => p.permanentId)).toContain("dev-perm-0-reload-plug-in-host");
  const security = page.getByRole("button", { name: /^your security · 6/i });
  await expect(security).toBeVisible();
  await expect(security.locator(".game-security-card--revealed")).toHaveCount(0);
  await scenario.healthy();
});
