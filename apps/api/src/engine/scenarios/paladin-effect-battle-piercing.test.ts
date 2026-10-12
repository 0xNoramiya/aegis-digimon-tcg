import { expect, it } from "vitest";
import type { Intent } from "@aegis/shared/protocol/intents";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/paladin-effect-battle-piercing.fixture";
import "#api/cards/EX13/EX13-076";

it.each([false, true])(
  "Paladin's effect battle checks security only during an attack=$attacking",
  async (attacking) => {
    const prepared = {
      ...fixture,
      board: {
        ...fixture.board,
        0: {
          ...fixture.board[0],
          ...(attacking
            ? { hand: [], trash: [], battleArea: [{ card: "EX13-076", as: "paladin", under: fixture.board[0]!.trash }] }
            : {}),
        },
      },
    };
    const s = setupScenario(prepared, { autoAcceptOptional: true, autoSelectCards: true });
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      let intent: Intent;
      if (attacking) {
        intent = {
          type: "attack",
          attackerPermanentId: s.perm("paladin").permanentId,
          target: { kind: "permanent", permanentId: s.perm("target").permanentId },
        };
      } else {
        intent = {
          type: "playCard",
          instanceId: s.inst("paladin").instanceId,
          assembly: { materialInstanceIds: s.state.players[0]!.trash.map((card) => card.instanceId) },
        };
      }
      expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
      await settle(
        () => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision && !s.state.combatWindow,
      );
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.security).toHaveLength(attacking ? 4 : 5);
      expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(attacking ? 1 : 0);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
