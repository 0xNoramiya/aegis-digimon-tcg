import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/knightmon-tamer-inheritance.fixture";
import "#api/cards/P/P-111";
import "#api/cards/EX13/EX13-074";
import "#api/cards/EX13/EX13-064";

it.each(["EX13-074", "EX13-064"])(
  "Knightmon grants its inherited attack effect only to a Digimon host %s",
  async (host) => {
    const prepared = {
      ...fixture,
      board: {
        ...fixture.board,
        0: {
          ...fixture.board[0],
          battleArea: [{ card: host, as: "host", under: [{ card: "P-111", as: "knightmon" }] }],
        },
      },
    };
    const s = setupScenario(prepared, { autoAcceptOptional: true, autoSelectCards: true });
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(1);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.state.players[0]!.security.length === 4 && !s.state.pendingDecision && !s.state.combatWindow,
      );
      expect(
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("playable").instanceId,
        ),
      ).toBe(host === "EX13-064");
      expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "P-111")).toBe(
        host === "EX13-064",
      );
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
