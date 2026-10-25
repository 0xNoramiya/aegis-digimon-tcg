import { test, expect } from "@e2e/scenario-page";
import { stubCardArtwork } from "@e2e/card-artwork";
import fixture from "@api-fixtures/sukas-curse-requires-both-colors.fixture";

test("Suka's Curse becomes usable after a black Tamer supplies its missing color", async ({ scenario, page }) => {
  await stubCardArtwork(page);
  const refs = await scenario.openFixture({ ...fixture, memory: 8 }, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  const before = await scenario.snapshot();
  expect(before.players[0]!.hand.find((card) => card.instanceId === refs.instanceId("curse"))?.playableFromHand).toBe(
    false,
  );
  await scenario.hand("Suka's Curse");
  const inspector = page.getByRole("dialog", { name: "Suka's Curse", exact: true });
  await expect(inspector).toBeVisible();
  await expect(page.getByRole("button", { name: "Play Option", exact: true })).toHaveCount(0);
  await inspector.getByRole("button", { name: "Close", exact: true }).click();

  await scenario.play("Tai Kamiya", "Tamer");
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision &&
      state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === refs.instanceId("blackTamer")),
  );
  const afterTai = await scenario.snapshot();
  expect(afterTai.memory).toBe(4);
  expect(afterTai.players[0]!.hand.find((card) => card.instanceId === refs.instanceId("curse"))?.playableFromHand).toBe(
    true,
  );
  await scenario.play("Suka's Curse", "Option");
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision &&
      state.players[0]!.battleArea.find((permanent) => permanent.permanentId === refs.permanentId("yellowChuumon"))
        ?.topCard.instanceId === refs.instanceId("sukamon"),
    (decision) => {
      const candidates = decision.options.candidateInstanceIds ?? [];
      if (candidates.includes(refs.permanentId("yellowChuumon"))) {
        return { instanceId: refs.permanentId("yellowChuumon") };
      }
      if (candidates.includes(refs.instanceId("yellowChuumon"))) {
        return { instanceId: refs.instanceId("yellowChuumon") };
      }
      if (candidates.includes(refs.instanceId("sukamon"))) {
        return { instanceId: refs.instanceId("sukamon") };
      }
      return { accept: true };
    },
  );
  const after = await scenario.snapshot();
  const host = after.players[0]!.battleArea.find(
    (permanent) => permanent.permanentId === refs.permanentId("yellowChuumon"),
  )!;
  expect(host.stack.map((card) => card.cardId)).toEqual(["BT14-003", "BT14-032"]);
  expect(after.memory).toBe(1);
  expect(after.players[0]!.trash.some((card) => card.instanceId === refs.instanceId("curse"))).toBe(true);
  expect(after.pendingDecision).toBeUndefined();
  await scenario.healthy();
});
