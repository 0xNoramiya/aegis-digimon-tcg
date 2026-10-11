import fixtureRuinModeHatch from "./ruin-mode-hatch.fixture.js";
import fixtureProgressProtection from "./progress-protection.fixture.js";
import fixtureImperialdramonSecurityBounce from "./imperialdramon-security-bounce.fixture.js";
import fixtureImperialdramonNoBounce from "./imperialdramon-no-bounce.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture, type ScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

async function start(id: ScenarioFixture) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: [fixturePermanentId("progress-protection-0-field-0")],
    },
  );
  layScenarioFixture(s.state, id, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

it("hatches after a public Ruin Mode attack with a resident Tamer", async () => {
  const { s, loop } = await start(fixtureRuinModeHatch);
  try {
    const human = s.state.players[0]!;
    const ruin = human.battleArea.find((p) => p.topCard.cardId === "EX4-074")!;
    const egg = human.eggDeck[0]!.instanceId;
    const beforeSecurity = human.security.length;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: ruin.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () => !observe(s.engine).isAttacking() && !s.state.pendingDecision && human.breeding?.topCard.instanceId === egg,
    );
    expect(human.trash.some((c) => c.instanceId === ruin.topCard.instanceId)).toBe(true);
    expect(human.security).toHaveLength(beforeSecurity + 1);
    expect(human.breeding?.topCard.cardId).toBe("BT1-006");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it("protection control: Progress survives an opposing reactive deletion during its public attack", async () => {
  const { s, loop } = await start(fixtureProgressProtection);
  try {
    const attacker = s.state.players[0]!.battleArea[0]!;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.state.pendingDecision);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true);
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(4);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it("Examon's immediate effect battle precedes Raid from the declared DNA attack", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT1-080", as: "green" },
          { card: "ST2-10", as: "blue" },
        ],
        hand: [{ card: "EX13-045", as: "examon" }],
        deck: Array(12).fill("BT1-009"),
      },
      1: {
        battleArea: [
          { card: "BT1-013", as: "first" },
          { card: "BT1-010", as: "raid" },
        ],
        security: Array(5).fill("BT1-009"),
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
  );
  s.state.memory = 5;
  await s.ready();
  const firstId = s.perm("first").permanentId;
  const raidId = s.perm("raid").permanentId;
  expect(
    s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      instanceId: s.inst("examon").instanceId,
      materialPermanentIds: [s.perm("green").permanentId, s.perm("blue").permanentId],
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && !s.state.pendingDecision);
  const firstDeletion = s.events.findIndex(
    (e) => e.kind === "cardsMoved" && e.deletedPermanents?.some((p) => p.permanentId === firstId),
  );
  const raidRedirect = s.events.findIndex(
    (e) =>
      e.kind === "attackDeclared" && e.redirected && e.target.kind === "permanent" && e.target.permanentId === raidId,
  );
  expect(firstDeletion).toBeGreaterThanOrEqual(0);
  expect(raidRedirect).toBeGreaterThan(firstDeletion);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.state.players[1]!.security).toHaveLength(3);
  expect(s.state.memory).toBe(5);
  assertNoLoudGap(s);
});

it.each([false, true])(
  "control: Imperialdramon returns only when a printed security effect returns it (bounce=%s)",
  async (bounce) => {
    const { s, loop } = await start(bounce ? fixtureImperialdramonSecurityBounce : fixtureImperialdramonNoBounce);
    try {
      const human = s.state.players[0]!;
      const imperial = human.battleArea[0]!;
      const instanceId = imperial.topCard.instanceId;
      const sources = imperial.stack.map((c) => c.instanceId);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: imperial.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && !s.state.pendingDecision);
      expect(human.hand.some((c) => c.instanceId === instanceId)).toBe(bounce);
      expect(human.battleArea.some((p) => p.permanentId === imperial.permanentId)).toBe(!bounce);
      expect(human.trash.filter((c) => sources.includes(c.instanceId))).toHaveLength(bounce ? 2 : 0);
      expect(
        human.battleArea.find((p) => p.permanentId === imperial.permanentId)?.stack.map((c) => c.instanceId),
      ).toEqual(bounce ? undefined : sources);
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
