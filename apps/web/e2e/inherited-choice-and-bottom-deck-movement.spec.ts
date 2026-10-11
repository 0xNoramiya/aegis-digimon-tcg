import fixtureEx11CloseStartMainDecline from "../../api/src/engine/scenarios/ex11-close-start-main-decline.fixture";
import fixtureP146ReloadPlugInFaceDown from "../../api/src/engine/scenarios/p146-reload-plug-in-face-down.fixture";
import { fixtureInstanceId, fixturePermanentId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

test("EX11-065 Close's Start of Main cost can be declined", async ({ scenario }) => {
  await scenario.openFixture(fixtureEx11CloseStartMainDecline);
  let declined = false;
  await scenario.resolveUntil(
    (state) => declined && state.phase === "Main" && !state.pendingDecision,
    (decision) => {
      expect(decision).toMatchObject({ kind: "selectCards", sourceCardId: "EX11-065" });
      expect(decision.options).toMatchObject({
        candidateInstanceIds: [fixtureInstanceId("own-source-close-decline-gotsumon-0-card")],
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
  expect(
    human.battleArea.find((p) => p.permanentId === fixturePermanentId("own-close-decline-gotsumon"))!.stack,
  ).toHaveLength(1);
  expect(human.breeding?.stack.map((card) => card.cardId)).toEqual(["EX8-005"]);
  await expect(scenario.page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  await scenario.healthy();
});

test("Reload Plug-In Q joins security face down", async ({ scenario }) => {
  await scenario.openFixture(fixtureP146ReloadPlugInFaceDown, "normal", "none");
  const page = scenario.page;
  await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  await page.locator(`[data-drop="perm-you"][data-id="${fixturePermanentId("own-reload-plug-in-host")}"]`).click();
  await page.getByRole("button", { name: "Attack", exact: true }).click();
  await page.locator(`[data-drop="perm-opp"][data-id="${fixturePermanentId("opponent-reload-plug-in-wall")}"]`).click();
  await scenario.resolveUntil(
    (state) => state.players[0]!.securityView.length === 6 && !state.pendingDecision && !state.combatWindow,
    () => ({ accept: true }),
  );
  const human = (await scenario.snapshot()).players[0]!;
  expect(human.securityView.every((card) => card.faceUp !== true)).toBe(true);
  expect(human.battleArea.map((p) => p.permanentId)).toContain(fixturePermanentId("own-reload-plug-in-host"));
  const security = page.getByRole("button", { name: /^your security · 6/i });
  await expect(security).toBeVisible();
  await expect(security.locator(".game-security-card--revealed")).toHaveCount(0);
  await scenario.healthy();
});
