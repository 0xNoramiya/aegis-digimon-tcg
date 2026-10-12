import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import evolvedFixture from "#api/engine/scenarios/material-save-digixros-only-names.fixture";
import printedFixture from "#api/engine/scenarios/material-save-original-names.fixture";
import "#api/cards/BT10/BT10-013";
import "#api/cards/BT10/BT10-087";
import "#api/cards/BT10/BT10-034";
import "#api/cards/BT10/BT10-060";
import "#api/cards/BT19/BT19-038";
import "#api/cards/BT19/BT19-061";

it.each([
  { fixture: evolvedFixture, saved: false },
  { fixture: printedFixture, saved: true },
])("$fixture.name applies Material Save eligibility after a real security battle", async ({ fixture, saved }) => {
  const s = setupScenario(fixture, { autoSelectCards: true });
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shoutmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.some((event) => event.kind === "attackEnded") && !s.state.pendingDecision && !s.state.combatWindow,
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("shoutmon").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual(
      saved ? [s.inst("secondSource").instanceId, s.inst("firstSource").instanceId] : [],
    );
    expect(s.decisions.some(({ req }) => req.promptText?.includes("Material Save"))).toBe(saved);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("firstSource").instanceId)).toBe(!saved);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("secondSource").instanceId)).toBe(
      !saved,
    );
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
