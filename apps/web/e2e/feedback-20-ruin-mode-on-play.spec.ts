import { test, expect } from "./scenario-page";

const RUIN_MODE_ID = "dev-perm-1-feedback20-ruin-mode";
const MONODRAMON_ID = "dev-perm-1-feedback20-monodramon";
const KUWAGAMON = "dev-feedback20-kuwagamon";
const LILLYMON = "dev-feedback20-lillymon";

test("feedback #20: Ruin Mode's -5000 DP deletes a 4000-DP play before its On Play, not an 8000-DP play", async ({
  scenario,
}) => {
  await scenario.open("arena-feedback20-ruin-mode-on-play");
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);

  await scenario.play("Plasma Stake", "Option");
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      !s.players[1]!.battleArea.some((p) => p.permanentId === RUIN_MODE_ID) &&
      s.players[1]!.trash.some((card) => card.cardId === "EX4-074"),
    () => ({ cardId: "EX4-074" }),
  );

  await scenario.play("Kuwagamon", "Digimon");
  await scenario.resolveUntil(
    (s) => !s.pendingDecision && s.players[0]!.trash.some((card) => card.instanceId === KUWAGAMON),
  );
  const afterKuwagamon = await scenario.snapshot();
  const monodramon = afterKuwagamon.players[1]!.battleArea.find((p) => p.permanentId === MONODRAMON_ID);
  expect(monodramon?.isSuspended).toBe(false);
  expect(afterKuwagamon.players[0]!.battleArea.some((p) => p.topCard.instanceId === KUWAGAMON)).toBe(false);

  // Lillymon's optional return targets the opponent's field, which the earlier notices cover.
  // A hovering mouse holds their reading time, so move it off them and let them expire.
  await scenario.page.mouse.move(720, 460);
  await expect(scenario.page.getByRole("button", { name: /^Dismiss / })).toHaveCount(0, { timeout: 30_000 });
  await scenario.play("Lillymon", "Digimon");
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      s.players[0]!.battleArea.some((p) => p.topCard.instanceId === LILLYMON) &&
      !s.players[1]!.battleArea.some((p) => p.permanentId === MONODRAMON_ID),
  );
  const final = await scenario.snapshot();
  const lillymon = final.players[0]!.battleArea.find((p) => p.topCard.instanceId === LILLYMON)!;
  expect(lillymon.currentDP).toBe(3000);
  // Lillymon spends the last memory, so the bot may already have drawn for its turn.
  expect(final.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(false);
  await scenario.healthy();
});
