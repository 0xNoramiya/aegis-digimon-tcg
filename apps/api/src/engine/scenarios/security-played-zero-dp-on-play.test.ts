import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const TAPIRMON = "BT24-043";
const GREEN_SCRAMBLE = "LM-030";
const KENTAUROSMON = "EX13-036";

async function setupGreenScrambleCheck() {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-080", as: "attacker" }],
        hand: [{ card: KENTAUROSMON, as: "kentaurosmon" }],
        deck: ["BT1-011", "BT1-012", "BT1-013"],
        security: 3,
      },
      1: {
        security: [{ card: GREEN_SCRAMBLE, as: "greenScramble" }, "BT1-009"],
        trash: [{ card: TAPIRMON, as: "tapirmon" }],
        deck: ["BT25-012", "BT25-020", "LM-061", "BT1-011"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 20;
  await s.ready();
  return s;
}

async function attackIntoGreenScramble(s: Awaited<ReturnType<typeof setupGreenScrambleCheck>>) {
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && !s.state.pendingDecision, 3000);
}

describe("Digimon played by a [Security] effect into a DP reduction", () => {
  it("is deleted at 0 DP before its [On Play] can activate (Q5293, Q3523)", async () => {
    const s = await setupGreenScrambleCheck();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kentaurosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === KENTAUROSMON) &&
        !s.state.pendingDecision,
    );
    await attackIntoGreenScramble(s);
    const opponent = s.state.players[1]!;
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "cardPlayed", cardId: TAPIRMON }));
    expect(opponent.battleArea).toHaveLength(0);
    expect(opponent.trash.map((card) => card.instanceId)).toContain(s.inst("tapirmon").instanceId);
    expect(opponent.hand.map((card) => card.instanceId)).toEqual([s.inst("greenScramble").instanceId]);
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === TAPIRMON)).toBe(false);
    expect(s.events.some((event) => event.kind === "cardRevealed" && event.sourceCardId === TAPIRMON)).toBe(false);
    expect(opponent.deck).toHaveLength(4);
  });

  it("activates its [On Play] after the [Security] effect when it survives", async () => {
    const s = await setupGreenScrambleCheck();
    await attackIntoGreenScramble(s);
    const opponent = s.state.players[1]!;
    expect(opponent.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("tapirmon").instanceId,
    ]);
    expect(opponent.hand.map((card) => card.instanceId)).toContain(s.inst("greenScramble").instanceId);
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === TAPIRMON)).toBe(true);
    const greenScrambleToHand = s.events.findIndex(
      (event) =>
        event.kind === "cardsMoved" &&
        event.to === "hand" &&
        event.instanceIds.includes(s.inst("greenScramble").instanceId),
    );
    const tapirmonTriggered = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === TAPIRMON,
    );
    expect(greenScrambleToHand).toBeGreaterThanOrEqual(0);
    expect(tapirmonTriggered).toBeGreaterThan(greenScrambleToHand);
  });
});
