import fixtureRichardMainMaterialsFaceDown from "../../api/src/engine/scenarios/richard-main-materials-face-down.fixture";
import fixtureRichardMainFreshMaterials from "../../api/src/engine/scenarios/richard-main-fresh-materials.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

// Discord 1558451244815880332: EX13-071 Richard Sampson's [Main] activation gate (Q7447).
const RICHARD_ID = fixturePermanentId("own-richard");
const KUDAMON_ID = fixturePermanentId("own-richard-kudamon");
const FACE_DOWN_REPPAMON = fixtureInstanceId("own-source-richard-0-card");
const FACE_DOWN_CHIRINMON = fixtureInstanceId("own-source-richard-1-card");
const MAIN_EFFECT = /^Activate effect: \[Main\]/;

test("Richard Sampson offers no [Main] while both materials are only face down under it", async ({
  scenario,
  page,
}) => {
  await scenario.openFixture(fixtureRichardMainMaterialsFaceDown);
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
  await scenario.openFixture(fixtureRichardMainFreshMaterials);
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
    [fixtureInstanceId("richard-trash-reppamon-card"), FACE_DOWN_REPPAMON],
    [fixtureInstanceId("richard-trash-chirinmon-card"), FACE_DOWN_CHIRINMON],
  ]);
  const human = (await scenario.snapshot()).players[0]!;
  const kentaurosmon = human.battleArea.find((permanent) => permanent.permanentId === KUDAMON_ID)!;
  expect(kentaurosmon.stack.map((card) => card.instanceId)).toEqual([
    FACE_DOWN_CHIRINMON,
    FACE_DOWN_REPPAMON,
    fixtureInstanceId("own-card-richard-kudamon-card"),
  ]);
  expect(human.battleArea.find((permanent) => permanent.permanentId === RICHARD_ID)!.stack).toHaveLength(0);
  expect(human.trash.map((card) => card.instanceId)).toEqual(
    expect.arrayContaining([
      fixtureInstanceId("richard-trash-reppamon-card"),
      fixtureInstanceId("richard-trash-chirinmon-card"),
    ]),
  );
  expect((await scenario.snapshot()).memory).toBe(1);
  await scenario.healthy();
});
