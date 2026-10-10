import type { Intent, Seat } from "@aegis/shared";
import { AegisRoom } from "../../api/dist/rooms/AegisRoom.js";
import { test, expect } from "./scenario-page";

const NEZHAMON = "dev-perm-1-feedback8-nezhamon";
const TAKUTOUMON = "dev-perm-0-feedback8-takutoumon";
const HAKUBAMON = "dev-perm-0-feedback8-hakubamon";

/**
 * Production order (match b20451e6): the defender declines the redirect and the Counter event
 * reaches the client before the state patch that clears the declined decision. Locally the patch
 * usually wins, so patches are held for a moment after the defender answers its own decision.
 */
function deliverCounterBeforeDeclinePatch(): () => void {
  const room = AegisRoom.prototype as unknown as {
    applyLoggedIntent(seat: Seat, intent: Intent): unknown;
    broadcastPatch(): boolean;
  };
  const originalApply = room.applyLoggedIntent;
  const originalPatch = room.broadcastPatch;
  let holdPatchesUntil = 0;
  room.applyLoggedIntent = function (seat, intent) {
    if (seat === 0 && intent.type === "respondDecision") holdPatchesUntil = Date.now() + 600;
    return originalApply.call(this, seat, intent);
  };
  room.broadcastPatch = function () {
    return Date.now() < holdPatchesUntil ? false : originalPatch.call(this);
  };
  return () => {
    room.applyLoggedIntent = originalApply;
    room.broadcastPatch = originalPatch;
  };
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test.describe(`Feedback 8 Nezhamon block after a declined redirect at ${viewport.width}px`, () => {
    test.use({
      viewport,
      holdBotAfterTurn: 3,
      // A list option must use Playwright's [value, options] form, or it is read as that pair.
      botMainIntents: [
        [{ type: "attack", attackerPermanentId: NEZHAMON, target: { kind: "player" } }, { type: "endPhase" }],
        { scope: "test" },
      ],
    });
    let restore: (() => void) | undefined;
    test.afterEach(() => restore?.());

    test("feedback 8: declining Cho-Hakkaimon's redirect still opens Counter and then the block window", async ({
      scenario,
    }) => {
      const { page } = scenario;
      restore = deliverCounterBeforeDeclinePatch();
      await scenario.open("arena-feedback8-nezhamon-counter-block");
      await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
      await page.getByRole("button", { name: /^End turn$/i }).click();

      await expect.poll(async () => (await scenario.snapshot()).pendingDecision?.seat).toBe(0);
      await page.getByRole("button", { name: /^(Don't use|No, decline)$/i }).click();

      const rail = page.getByRole("dialog", { name: "Counter timing" });
      await expect(rail).toBeVisible();
      await expect(rail).toContainText("Takutoumon");
      await expect
        .poll(async () => {
          const state = await scenario.snapshot();
          return { window: state.combatWindow, pending: state.pendingDecision };
        })
        .toMatchObject({
          window: { kind: "counter", seat: 0, attackerPermanentId: NEZHAMON },
          pending: undefined,
        });
      await expect(rail).toBeVisible();
      await rail.getByRole("button", { name: "Pass Counter" }).click();
      await expect(rail).toHaveCount(0);

      await expect
        .poll(async () => (await scenario.snapshot()).combatWindow)
        .toMatchObject({ kind: "block", seat: 0, attackerPermanentId: NEZHAMON, mustBlock: true });
      expect([...(await scenario.snapshot()).combatWindow!.eligiblePermanentIds].sort()).toEqual([
        HAKUBAMON,
        TAKUTOUMON,
      ]);
      await page.locator(`[data-id="${HAKUBAMON}"][role="button"]`).click();

      await scenario.resolveUntil(
        (s) =>
          !s.combatWindow &&
          !s.pendingDecision &&
          !s.players[0]!.battleArea.some((permanent) => permanent.permanentId === HAKUBAMON),
      );
      const blocked = (await scenario.presentation()).events.filter((event) => event.kind === "blocked");
      expect(blocked).toEqual([expect.objectContaining({ blockerPermanentId: HAKUBAMON })]);
      expect((await scenario.snapshot()).players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
        TAKUTOUMON,
      );
      await scenario.healthy();
    });
  });
}
