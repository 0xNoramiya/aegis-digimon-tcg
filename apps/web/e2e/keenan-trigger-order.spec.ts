import fixtureKeenanTriggerOrder from "../../api/src/engine/scenarios/keenan-trigger-order.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const GUARDROMON_ID = fixturePermanentId("own-keenan-guardromon");
const KEENAN_ID = fixturePermanentId("own-keenan-tamer");

test.use({ holdBotAfterTurn: 4 });

// Discord 1558478403219488899 (match b4b8e39b): Blast Digivolve in a forced attack's Counter
// timing played Gotsumon. Keenan Crier resolved at once and Gotsumon's [On Play] waited until
// after Counter timing. Both trigger on the same play, so the player orders them.
test("Keenan and Gotsumon's [On Play] share one order prompt", async ({ scenario, page }) => {
  await scenario.openFixture(fixtureKeenanTriggerOrder);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.evolve("GreatGrizzlymon", GUARDROMON_ID);
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.battleArea.find((permanent) => permanent.permanentId === GUARDROMON_ID)?.topCard.cardId ===
        "BT25-054" && !s.pendingDecision,
  );
  await page.getByRole("button", { name: /^end turn$/i }).click();
  await scenario.resolveUntil((s) => s.combatWindow?.kind === "counter");

  const leopardmon = page.locator(`[data-hand-instance-id="${fixtureInstanceId("keenan-leopardmon-card")}"]`);
  await leopardmon.focus();
  await leopardmon.press("Enter");
  await page.getByRole("button", { name: /GreatGrizzlymon.*Blast Digivolve/ }).click();
  let offered: string[] | undefined;
  await scenario.resolveUntil(
    (s) => s.combatWindow?.kind === "block",
    (decision) => {
      if (decision.kind === "orderTriggers") {
        offered = [...(decision.options.triggerCardIds ?? [])].sort();
        return { triggerCardId: "EX13-047" };
      }
      if (decision.kind === "selectCards" && decision.sourceCardId === "BT22-052") return { cardId: "EX13-047" };
      return { accept: true };
    },
  );

  expect(offered).toEqual(["BT13-102", "EX13-047"]);
  const probe = await scenario.presentation();
  const order = probe.events.flatMap((event) =>
    event.kind === "effectResolved" && (event.sourceCardId === "EX13-047" || event.sourceCardId === "BT13-102")
      ? [event.sourceCardId]
      : event.kind === "counterResolved"
        ? ["counterResolved"]
        : [],
  );
  expect(order).toEqual(["EX13-047", "BT13-102", "counterResolved"]);
  const state = await scenario.snapshot();
  expect(state.players[0]!.battleArea.find((permanent) => permanent.permanentId === KEENAN_ID)?.isSuspended).toBe(true);
  await scenario.healthy();
});
