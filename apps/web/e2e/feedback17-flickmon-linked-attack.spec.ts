import { test, expect } from "./scenario-page";

const TURBOMON = "dev-perm-0-feedback17-turbomon";
const MANEUVERMON = "dev-feedback17-maneuvermon";
const LINKED_MAQUINAMON = "dev-feedback17-linked-maquinamon";

test("Feedback #17: Flickmon reduces a linked Turbomon's digivolution only when it attacks", async ({ scenario }) => {
  test.setTimeout(120_000);
  await scenario.open("arena-feedback17-ex11-006-linked-attack");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  expect(before.memory).toBe(4);
  const maneuvermon = before.players[0]!.hand.find((card) => card.instanceId === MANEUVERMON)!;
  // The color route and the [Maquinamon] route both cost 3 outside the attack.
  expect(
    maneuvermon.digivolveRoutes.filter((route) => route.permanentId === TURBOMON).map((route) => route.projectedCost),
  ).toEqual([3, 3]);

  await scenario.attack(TURBOMON);
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.battleArea.find((p) => p.permanentId === TURBOMON)?.topCard.instanceId === MANEUVERMON &&
      !s.pendingDecision &&
      !s.combatWindow &&
      s.phase === "Main",
    (decision) => {
      if (decision.sourceCardId === "EX11-006") {
        if (decision.kind === "optional") return { accept: true };
        return { instanceId: MANEUVERMON };
      }
      if (decision.kind === "optional") return { accept: false };
      return {};
    },
  );

  const after = await scenario.snapshot();
  const host = after.players[0]!.battleArea.find((p) => p.permanentId === TURBOMON)!;
  expect(after.memory).toBe(3);
  expect(host.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX11-006", "EX11-027", "EX11-029"]));
  expect(host.linked.map((card) => card.instanceId)).toEqual([LINKED_MAQUINAMON]);
  expect(after.players[0]!.hand.map((card) => card.instanceId)).not.toContain(MANEUVERMON);
  await scenario.healthy();
});
