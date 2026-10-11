import { expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

it.each(["EX9-064", "EX12-064"])(
  "Feedback #58 comparative: %s unpaid inherited end-of-attack cost preserves its use",
  async (source) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-089", as: "host", under: [source] },
            { card: "BT1-009", as: "lowest" },
          ],
        },
        1: { security: ["ST1-02", "ST1-02"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowestId = s.perm("lowest").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("host"));
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([lowestId]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  },
);
