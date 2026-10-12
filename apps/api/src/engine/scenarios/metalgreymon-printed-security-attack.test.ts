import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/metalgreymon-printed-security-attack.fixture";
import "#api/cards/EX12/EX12-016";

it("MetalGreymon checks one security card without an inherited or granted bonus", async () => {
  const s = setupScenario(fixture);
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalgreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.some((event) => event.kind === "attackEnded") && !s.state.pendingDecision && !s.state.combatWindow,
    );
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.perm("metalgreymon").securityAttackModifier).toBe(0);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
