import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import fixture from "#api/engine/scenarios/effect-attack-on-player-only.fixture";
import "#api/cards/BT1/BT1-009";
import "#api/cards/BT22/BT22-012";
import "#api/cards/BT22/BT22-067";

it("an effect that lets a Digimon attack a player offers only the player as the target", async () => {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    const suspendedDefenderId = s.perm("suspendedDefender").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rizeGreymon").permanentId,
        instanceId: s.inst("lordKnightmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "attackEnded") &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );

    const targetChoice = s.decisions.find(({ req }) => req.options?.candidateInstanceIds?.includes("player"));
    expect(targetChoice?.req.options?.candidateInstanceIds).toEqual(["player"]);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toEqual([
      expect.objectContaining({ attackerCardId: "BT22-067", target: { kind: "player" } }),
    ]);
    expect(s.state.players[1]!.security.length).toBeLessThan(3);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(suspendedDefenderId);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
