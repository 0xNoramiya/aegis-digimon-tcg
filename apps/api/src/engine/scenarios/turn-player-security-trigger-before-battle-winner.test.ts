import { Phase } from "@aegis/shared/schema/enums";
import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/turn-player-security-trigger-before-battle-winner.fixture";
import "#api/cards/BT24/BT24-031";
import "#api/cards/BT24/BT24-101";
import "#api/cards/BT26/BT26-103";
import "#api/cards/BT25/BT25-054";
import "#api/cards/BT25/BT25-058";

it("resolves the turn player's security-removal triggers before the blocker's battle-win digivolution", async () => {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] });
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding && !s.state.pendingDecision);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.combatWindow?.kind === "block");
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("battleWinner").permanentId }),
    ).toEqual({ ok: true });
    await settle(
      () => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision && !s.state.combatWindow,
    );

    expect(s.decisions.map(({ seat, req }) => [seat, req.promptText])).toEqual([
      [0, "Prevent leaving the battle area?"],
      [0, "Choose the next pending effect to resolve."],
    ]);
    const battleArea = (seat: 0 | 1) => s.state.players[seat]!.battleArea.map((permanent) => permanent.permanentId);
    expect(battleArea(0)).toEqual([
      s.perm("attacker").permanentId,
      s.perm("protector").permanentId,
      s.perm("wrathMode").permanentId,
    ]);
    expect(battleArea(1)).toEqual([]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT25-054");
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("callismon").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.phase).toBe(Phase.Main);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
