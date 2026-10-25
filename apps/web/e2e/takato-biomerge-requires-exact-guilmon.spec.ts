import { test, expect } from "@e2e/scenario-page";
import { stubCardArtwork } from "@e2e/card-artwork";
import fixture from "@api-fixtures/takato-biomerge-requires-exact-guilmon.fixture";

test("Takato offers biomerge for exact Guilmon and leaves Guilmon X out of the evolution", async ({
  scenario,
  page,
}) => {
  await stubCardArtwork(page);
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  await page.locator(`[data-drop="perm-you"][data-id="${refs.permanentId("takato")}"]`).click();
  const inspector = page.getByRole("dialog", { name: "Takato Matsuki", exact: true });
  await expect(inspector).toBeVisible();
  await expect(page.getByRole("button", { name: /^Activate effect: \[Main\]/ })).toHaveCount(0);
  await inspector.getByRole("button", { name: "Close", exact: true }).click();

  let orderedReveal = false;
  await scenario.play("Guilmon", "Digimon");
  await scenario.resolveUntil(
    (state) =>
      orderedReveal &&
      !state.pendingDecision &&
      state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === refs.instanceId("guilmon")),
    (decision) => {
      if (decision.kind === "orderCards") {
        orderedReveal = true;
      }
      return {};
    },
  );
  const before = await scenario.snapshot();
  const hostId = before.players[0]!.battleArea.find(
    (permanent) => permanent.topCard.instanceId === refs.instanceId("guilmon"),
  )!.permanentId;
  await page.locator(`[data-drop="perm-you"][data-id="${refs.permanentId("takato")}"]`).click();
  await page.getByRole("button", { name: /^Activate effect: \[Main\]/ }).click();
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision &&
      state.players[0]!.battleArea.find((permanent) => permanent.permanentId === hostId)?.topCard.instanceId ===
        refs.instanceId("gallantmon"),
    (decision) => {
      const candidates = decision.options.candidateInstanceIds ?? [];
      if (decision.kind === "orderCards") {
        expect(candidates.toSorted()).toEqual(
          [refs.instanceId("takato"), refs.instanceId("growlmon"), refs.instanceId("warGrowlmon")].toSorted(),
        );
      }
      if (decision.kind === "selectCards" || decision.kind === "chooseTargets") {
        expect(candidates).not.toContain(refs.permanentId("guilmonX"));
        expect(candidates).not.toContain(refs.instanceId("guilmonX"));
        if (candidates.includes(hostId)) {
          return { instanceId: hostId };
        }
        if (candidates.includes(refs.instanceId("guilmon"))) {
          return { instanceId: refs.instanceId("guilmon") };
        }
        if (candidates.includes(refs.instanceId("gallantmon"))) {
          return { instanceId: refs.instanceId("gallantmon") };
        }
      }
      return { accept: true };
    },
  );
  const after = await scenario.snapshot();
  const human = after.players[0]!;
  const gallantmon = human.battleArea.find((permanent) => permanent.permanentId === hostId)!;
  expect(gallantmon.stack.map((card) => card.instanceId)).toEqual(
    expect.arrayContaining([
      refs.instanceId("takato"),
      refs.instanceId("growlmon"),
      refs.instanceId("warGrowlmon"),
      refs.instanceId("guilmon"),
    ]),
  );
  expect(
    human.battleArea.find((permanent) => permanent.permanentId === refs.permanentId("guilmonX"))?.topCard.cardId,
  ).toBe("EX8-009");
  expect(human.battleArea.some((permanent) => permanent.permanentId === refs.permanentId("takato"))).toBe(false);
  expect(after.memory).toBe(before.memory - 4);
  expect(after.pendingDecision).toBeUndefined();
  await scenario.healthy();
});
