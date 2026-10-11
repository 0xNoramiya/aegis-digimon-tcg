import prepared0 from "../../api/src/engine/scenarios/duplicate-option-choice.fixture";
import { fixtureVariant, fixtureInstanceId, fixturePermanentId } from "../../api/src/engine/scenario/references";

const preparedFixtures = { "duplicate-option-choice": prepared0 };

import { test, expect } from "./scenario-page";

const BASE = fixturePermanentId("dev-perm-0-feedback60-base");
const OLD = fixtureInstanceId("feedback60-old");
const PENDING = fixtureInstanceId("feedback60-pending");
const DUAL = fixtureInstanceId("feedback60-dual");

test.use({ holdBotAfterTurn: 1 });

const cases: { width: number; theme: "light" | "dark"; selection: "old" | "pending" | "refuse" }[] = [
  1440, 390,
].flatMap((width) =>
  (["light", "dark"] as const).flatMap((theme) =>
    (["old", "pending"] as const).map((selection) => ({ width, theme, selection })),
  ),
);
cases.push({ width: 390, theme: "light", selection: "refuse" });

for (const { width, theme, selection } of cases) {
  test(`Feedback #60: choose ${selection} at ${width}px in ${theme}`, async ({ scenario, page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.addInitScript((dark) => localStorage.setItem("aegis:darkMode", String(dark)), theme === "dark");
    await scenario.openFixture(fixtureVariant(preparedFixtures, "duplicate-option-choice"));
    await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
    const before = await scenario.snapshot();
    expect(before.memory).toBe(10);
    if (process.env.AEGIS_E2E_PRODUCTION === "true") {
      await expect(page.locator("style[data-vite-dev-id]")).toHaveCount(0);
      expect(await page.locator('link[rel="stylesheet"][href*="/assets/"]').count()).toBeGreaterThan(0);
    }
    expect(await page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(theme === "dark");
    let duplicates = 0;
    await scenario.evolve("LadyDevimon", BASE);
    await scenario.resolveUntil(
      (state) =>
        duplicates === 1 &&
        state.memory === (selection === "pending" ? 4 : 5) &&
        !state.pendingDecision &&
        state.players[0]!.trash.some((card) => card.instanceId === DUAL),
      async (decision) => {
        const candidates = decision.options.candidateInstanceIds ?? [];
        if (decision.kind === "optional") {
          return { accept: !decision.options.effectKey?.includes("when-digivolving-place-draw") };
        }
        if (decision.kind === "selectCards" || decision.kind === "chooseTargets") {
          if (decision.promptText.includes("Arts Digivolve")) return { accept: false };
          if (decision.sourceCardId === "BT25-085" && candidates.includes(OLD) && candidates.includes(PENDING)) {
            duplicates++;
            expect(decision.options.pendingEffectInstanceIds).toEqual([PENDING]);
            const state = await scenario.snapshot();
            expect(JSON.parse(state.pendingDecision!.payloadJson).pendingEffectInstanceIds).toEqual([PENDING]);
            const oldCard = page.getByRole("dialog").locator(`[data-instance-id="${OLD}"]`);
            const pendingCard = page.getByRole("dialog").locator(`[data-instance-id="${PENDING}"]`);
            await expect(oldCard.getByText("copy 1 of 2", { exact: true })).toBeVisible();
            await expect(pendingCard.getByText("copy 2 of 2", { exact: true })).toBeVisible();
            await expect(pendingCard.getByText("Pending effect", { exact: true })).toBeVisible();
            await expect(oldCard.getByText("Pending effect", { exact: true })).toHaveCount(0);
            await expect(pendingCard).toHaveAccessibleName(/Pending effect/);
            const confirm = page.getByRole("button", { name: "Confirm targets", exact: true });
            await expect(confirm).toBeVisible();
            await expect(confirm).toBeInViewport({ ratio: 1 });
            const panel = page.getByRole("dialog").filter({ has: confirm });
            const bounds = (await panel.boundingBox())!;
            expect(bounds.y).toBeGreaterThanOrEqual(-1);
            expect(bounds.y + bounds.height).toBeLessThanOrEqual((width === 390 ? 844 : 1000) + 1);
            await test.info().attach(`duplicate-${selection}-${width}-${theme}`, {
              body: await page.screenshot(),
              contentType: "image/png",
            });
            return selection === "refuse" ? { accept: false } : { instanceId: selection === "old" ? OLD : PENDING };
          }
          const instanceId = [DUAL, PENDING, BASE].find((id) => candidates.includes(id));
          return instanceId ? { instanceId } : {};
        }
        return {};
      },
    );
    const after = await scenario.snapshot();
    expect(duplicates).toBe(1);
    expect(after.memory).toBe(selection === "pending" ? 4 : 5);
    expect(after.phase).toBe("Main");
    expect(after.turnSeat).toBe(0);
    expect(after.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 1);
    expect(after.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        fixtureInstanceId("feedback60-reserve"),
        fixtureInstanceId("feedback60-deck-0-0"),
        fixtureInstanceId("feedback60-deck-0-1"),
      ]),
    );
    expect(after.players[0]!.hand.some((card) => card.instanceId === fixtureInstanceId("feedback60-lady"))).toBe(false);
    const lady = after.players[0]!.battleArea.find((permanent) => permanent.permanentId === BASE)!;
    expect(lady.topCard.instanceId).toBe(fixtureInstanceId("feedback60-lady"));
    expect(lady.stack.map((card) => card.instanceId)).toEqual(
      selection === "refuse"
        ? [fixtureInstanceId("dev-field-0-feedback60-base")]
        : [selection === "old" ? OLD : PENDING, fixtureInstanceId("dev-field-0-feedback60-base")],
    );
    expect(after.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      selection === "refuse" ? [OLD, PENDING, DUAL] : [selection === "old" ? PENDING : OLD, DUAL],
    );
    expect(after.players[1]!.battleArea).toHaveLength(0);
    expect(after.players[1]!.trash.map((card) => card.instanceId)).toEqual([
      fixtureInstanceId("dev-field-1-feedback60-victim"),
    ]);
    expect(after.players[0]!.securityCount).toBe(before.players[0]!.securityCount);
    const events = (await scenario.presentation()).events;
    const hurricane = events.filter((event) => event.kind === "effectTriggered" && event.sourceInstanceId === PENDING);
    expect(hurricane).toHaveLength(selection === "pending" ? 0 : 1);
    if (selection !== "pending") {
      const parentResolved = events.findIndex(
        (event) =>
          event.kind === "effectResolved" &&
          event.sourceCardId === "BT25-083" &&
          event.effectKey?.includes("trash-source-use-option"),
      );
      const trigger = events.findIndex(
        (event) => event.kind === "effectTriggered" && event.sourceInstanceId === PENDING,
      );
      expect(parentResolved).toBeGreaterThanOrEqual(0);
      expect(trigger).toBeGreaterThan(parentResolved);
    }
    await expect(page.locator(".decision-overlay__pending-effect")).toHaveCount(0);
    await scenario.healthy();
  });
}
