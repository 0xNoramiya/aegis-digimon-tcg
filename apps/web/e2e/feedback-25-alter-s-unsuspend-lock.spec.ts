import { test, expect } from "./scenario-page";

const ALTER_S = "dev-perm-0-feedback25-alter-s";
const KUWAGAMON = "dev-perm-1-feedback25-kuwagamon";

// Feedback #25: Kuwagamon's "suspend 1 of your opponent's Digimon. It can't unsuspend in their
// next unsuspend phase" also locks a Digimon that is already suspended (Q4792). Alter-S skips one
// unsuspend phase per lock, then unsuspends as normal.
test.use({
  holdBotAfterTurn: 5,
  botOptionalScript: { sourceCardId: "EX9-038", answers: [true] },
  // A list option must use Playwright's [value, options] form, or it is read as that pair.
  botMainIntents: [
    [{ type: "attack", attackerPermanentId: KUWAGAMON, target: { kind: "player" } }, { type: "endPhase" }],
    { scope: "test" },
  ],
});

test("feedback #25: Kuwagamon re-locks a suspended Alter-S for one unsuspend phase only", async ({ scenario }) => {
  const { page } = scenario;
  const alterS = (s: Awaited<ReturnType<typeof scenario.snapshot>>) =>
    s.players[0]!.battleArea.find((p) => p.permanentId === ALTER_S)!;
  const endTurnAndWaitForOwnBreeding = async () => {
    const endedTurn = (await scenario.snapshot()).turnCount;
    await page.getByRole("button", { name: /^End turn$/i }).click();
    await expect
      .poll(
        async () => {
          const s = await scenario.snapshot();
          return s.turnSeat === 0 && s.turnCount === endedTurn + 2 && s.phase === "Breeding";
        },
        { timeout: 60_000 },
      )
      .toBe(true);
    await scenario.idle();
  };

  await scenario.open("arena-feedback25-alter-s-unsuspend-lock");
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  await scenario.attack(ALTER_S);
  await scenario.resolveUntil(
    (s) => s.phase === "Main" && alterS(s).isSuspended && !s.pendingDecision && !s.combatWindow,
    () => ({ accept: false }),
  );

  await endTurnAndWaitForOwnBreeding();
  const afterLock = await scenario.snapshot();
  const kuwagamon = afterLock.players[1]!.battleArea.find((p) => p.permanentId === KUWAGAMON)!;
  expect(kuwagamon.stack).toHaveLength(1);
  expect(alterS(afterLock).isSuspended).toBe(true);

  await page.getByRole("button", { name: /^end breeding$/i }).click();
  await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);
  expect(alterS(await scenario.snapshot()).isSuspended).toBe(true);

  await endTurnAndWaitForOwnBreeding();
  expect(alterS(await scenario.snapshot()).isSuspended).toBe(false);
  await page.getByRole("button", { name: /^end breeding$/i }).click();
  await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);
  await scenario.attack(ALTER_S);
  await scenario.resolveUntil(
    (s) => alterS(s).isSuspended && !s.pendingDecision && !s.combatWindow,
    () => ({ accept: false }),
  );

  await scenario.idle();
  const probe = await scenario.presentation();
  expect(probe.pending).toBe(0);
  expect(probe.steps.filter((step) => step.failed || step.cancelled)).toEqual([]);
  expect(probe.gateExpiries).toEqual([]);
  expect(scenario.errors).toEqual([]);
});
