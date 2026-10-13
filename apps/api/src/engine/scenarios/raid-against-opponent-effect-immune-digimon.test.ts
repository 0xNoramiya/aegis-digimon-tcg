import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { Phase } from "@aegis/shared";
import fixture from "#api/engine/scenarios/raid-against-opponent-effect-immune-digimon.fixture";
import "#api/cards/BT19/BT19-101";
import "#api/cards/BT20/BT20-102";

it("Raid can switch the attack to a Digimon unaffected by the attacker's effects", async () => {
  const s = setupScenario(fixture);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const first = s.perm("first-immune-defender");
    const second = s.perm("second-immune-defender");
    expect(first.immuneToOpponentDigimonEffects && first.immuneToOpponentOptionEffects).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raid-attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.promptText.includes("Raid") === true);
    const raid = s.state.pendingDecision!;
    expect(raid.kind).toBe("selectCards");
    expect(JSON.parse(raid.payloadJson).candidateInstanceIds).toEqual([
      s.inst("first-immune-defender-card").instanceId,
      s.inst("second-immune-defender-card").instanceId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: raid.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("second-immune-defender-card").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.some((event) => event.kind === "attackEnded") && !s.state.pendingDecision && !s.state.combatWindow,
    );
    expect(
      s.events.some(
        (event) =>
          event.kind === "attackDeclared" &&
          event.redirected &&
          event.target.kind === "permanent" &&
          event.target.permanentId === second.permanentId,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([first.permanentId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(3);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
