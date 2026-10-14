import { test, expect } from "@e2e/scenario-page";
import { stubCardArtwork } from "@e2e/card-artwork";
import fixture from "@api-fixtures/imperialdramon-fighter-chooses-dragon-mode-source.fixture";

test.beforeEach(async ({ page }) => stubCardArtwork(page));

test("Fighter Mode lets the player choose which Dragon Mode source it returns", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture);
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  await scenario.attack(refs.permanentId("dragon"));
  const dragonModes = [refs.instanceId("dragonModeBt12"), refs.instanceId("dragonModeBt3")].toSorted();
  let sourceChoices = 0;
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision &&
      state.players[0]!.hand.some((card) => card.instanceId === refs.instanceId("dragonModeBt12")),
    (decision) => {
      if (decision.kind === "selectCards") {
        sourceChoices += 1;
        expect(decision.options.candidateInstanceIds?.toSorted()).toEqual(dragonModes);
        return { instanceId: refs.instanceId("dragonModeBt12") };
      }
      return { accept: true };
    },
  );
  const state = await scenario.snapshot();
  const fighter = state.players[0]!.battleArea.find((perm) => perm.permanentId === refs.permanentId("dragon"))!;
  expect(sourceChoices).toBe(1);
  expect(fighter.topCard.instanceId).toBe(refs.instanceId("fighter"));
  expect(fighter.stack.map((card) => card.instanceId)).toContain(refs.instanceId("dragonModeBt3"));
  expect(fighter.stack.map((card) => card.instanceId)).not.toContain(refs.instanceId("dragonModeBt12"));
  expect(state.players[1]!.battleArea).toHaveLength(0);
  await scenario.healthy();
});
