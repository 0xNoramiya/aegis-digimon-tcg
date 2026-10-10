import { test, expect } from "./scenario-page";

// Discord 1558451244815880332: EX13-071 Richard Sampson's [Main] activation gate (Q7447).
const RICHARD_ID = "dev-perm-0-richard";
const KUDAMON_ID = "dev-perm-0-richard-kudamon";
const FACE_DOWN_REPPAMON = "dev-stack-0-richard-0";
const FACE_DOWN_CHIRINMON = "dev-stack-0-richard-1";
const MAIN_EFFECT = /^Activate effect: \[Main\]/;

test("Richard Sampson offers no [Main] while both materials are only face down under it", async ({
  scenario,
  page,
}) => {
  await scenario.open("arena-discord-richard-main-materials-face-down");
  await scenario.resolveUntil(
    (s) => s.phase === "Main" && !s.pendingDecision,
    () => ({ accept: false }),
  );

  await page.locator(`[data-drop="perm-you"][data-id="${RICHARD_ID}"]`).click();
  // With no legal action, a click opens the card inspector instead of the Actions menu.
  await expect(page.getByRole("heading", { name: "Richard Sampson", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Actions", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: MAIN_EFFECT })).toHaveCount(0);
  await scenario.healthy();
});

test("Richard Sampson's [Main] stacks the materials it just trashed from under it", async ({ scenario, page }) => {
  await scenario.open("arena-discord-richard-main-fresh-materials");
  await scenario.resolveUntil(
    (s) => s.phase === "Main" && !s.pendingDecision,
    () => ({ accept: false }),
  );

  await page.locator(`[data-drop="perm-you"][data-id="${RICHARD_ID}"]`).click();
  await page.getByRole("button", { name: MAIN_EFFECT }).click();

  const offered: string[][] = [];
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      s.players[0]!.battleArea.find((permanent) => permanent.permanentId === KUDAMON_ID)?.topCard.cardId === "BT3-043",
    (decision) => {
      if (decision.kind !== "selectCards") return {};
      const candidates = [...decision.options.candidateInstanceIds!];
      offered.push(candidates);
      const fresh = [FACE_DOWN_REPPAMON, FACE_DOWN_CHIRINMON].find((id) => candidates.includes(id));
      return { instanceId: fresh };
    },
  );

  expect(offered).toEqual([
    ["dev-richard-trash-reppamon", FACE_DOWN_REPPAMON],
    ["dev-richard-trash-chirinmon", FACE_DOWN_CHIRINMON],
  ]);
  const human = (await scenario.snapshot()).players[0]!;
  const kentaurosmon = human.battleArea.find((permanent) => permanent.permanentId === KUDAMON_ID)!;
  expect(kentaurosmon.stack.map((card) => card.instanceId)).toEqual([
    FACE_DOWN_CHIRINMON,
    FACE_DOWN_REPPAMON,
    "dev-field-0-richard-kudamon",
  ]);
  expect(human.battleArea.find((permanent) => permanent.permanentId === RICHARD_ID)!.stack).toHaveLength(0);
  expect(human.trash.map((card) => card.instanceId)).toEqual(
    expect.arrayContaining(["dev-richard-trash-reppamon", "dev-richard-trash-chirinmon"]),
  );
  expect((await scenario.snapshot()).memory).toBe(1);
  await scenario.healthy();
});
