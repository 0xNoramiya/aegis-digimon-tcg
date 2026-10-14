import fixture from "../../api/src/engine/scenarios/counter-redirect-battles-new-target.fixture";
import { fixturePermanentId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const OGREMON = fixturePermanentId("ogremon");
const BYSTANDER = fixturePermanentId("bystander");

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test.describe(`WarGreymon Counter redirect at ${viewport.width}px`, () => {
    test.use({
      viewport,
      holdBotAfterTurn: 2,
      botMainIntents: [
        [{ type: "attack", attackerPermanentId: OGREMON, target: { kind: "player" } }, { type: "endPhase" }],
        { scope: "test" },
      ],
    });

    test("the attack battles Omnimon instead of checking security", async ({ scenario }) => {
      test.setTimeout(120_000);
      const { page } = scenario;
      await scenario.openFixture(fixture, "normal", "none");

      const rail = page.getByRole("dialog", { name: "Counter timing" });
      await expect(rail).toBeVisible({ timeout: 30_000 });
      await expect(rail).toContainText("WarGreymon");
      await rail.getByRole("button", { name: /activate/i }).click();
      await expect(rail).toHaveCount(0);

      await scenario.resolveUntil(
        (state) =>
          !state.pendingDecision &&
          !state.combatWindow &&
          !state.players[1]!.battleArea.some((permanent) => permanent.permanentId === OGREMON),
        (decision) => (decision.options.candidateInstanceIds?.includes(BYSTANDER) ? { instanceId: BYSTANDER } : {}),
      );

      const final = await scenario.snapshot();
      expect(final.players[0]!.securityCount).toBe(3);
      expect(final.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX12-037"]);
      expect(final.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-069");
      const { events } = await scenario.presentation();
      expect(events.find((event) => event.kind === "attackDeclared" && event.redirected === true)).toMatchObject({
        target: { kind: "permanent" },
        targetCardId: "EX12-037",
      });
      expect(events.some((event) => event.kind === "securityChecked")).toBe(false);
      await scenario.healthy();
    });
  });
}
