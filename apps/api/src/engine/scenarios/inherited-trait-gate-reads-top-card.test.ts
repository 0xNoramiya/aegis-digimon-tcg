import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { buildInheritedTraitGateReadsTopCard } from "#api/engine/scenarios/inherited-trait-gate-reads-top-card.fixture";
import "#api/cards/BT7/BT7-064";

type AttackPlayerWithHostParams = {
  hostCardId: string;
};

async function attackPlayerWithHost({ hostCardId }: AttackPlayerWithHostParams) {
  const s = setupScenario(buildInheritedTraitGateReadsTopCard({ hostCardId }));
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.some((event) => event.kind === "attackEnded") && !s.state.pendingDecision && !s.state.combatWindow,
    );
    return {
      securityChecks: s.events.filter((event) => event.kind === "securityChecked").length,
      opponentSecurity: s.state.players[1]!.security.length,
      hostSuspended: s.perm("host").isSuspended,
      memory: s.state.memory,
      turnSeat: s.state.turnSeat,
    };
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
}

it("checks one security card when the top card lacks the trait its inherited Security Attack requires", async () => {
  expect(await attackPlayerWithHost({ hostCardId: "BT3-089" })).toEqual({
    securityChecks: 1,
    opponentSecurity: 4,
    hostSuspended: true,
    memory: 5,
    turnSeat: 0,
  });
});

it("checks two security cards when the top card has the trait its inherited Security Attack requires", async () => {
  expect(await attackPlayerWithHost({ hostCardId: "BT8-017" })).toEqual({
    securityChecks: 2,
    opponentSecurity: 3,
    hostSuspended: true,
    memory: 5,
    turnSeat: 0,
  });
});
