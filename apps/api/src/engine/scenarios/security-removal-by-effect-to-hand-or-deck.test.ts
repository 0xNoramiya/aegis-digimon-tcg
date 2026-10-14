import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { observe } from "#api/engine/testkit/observe";
import { settle, setupEngine } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/security-removal-by-effect-to-hand-or-deck.fixture";
import "#api/cards/BT25/BT25-041";
import "#api/cards/BT25/BT25-035";
import "#api/cards/BT26/BT26-089";

it("Kyo gives Security A. -1 when an effect cost adds the top security card to the hand", async () => {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("murasamemon-card").instanceId,
        permanentId: s.perm("cougarmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("kyo-top-security").instanceId);
    expect(s.perm("kyo").isSuspended).toBe(true);
    expect(s.perm("kyo").stack.map(({ instanceId, faceUp }) => ({ instanceId, faceUp }))).toEqual([
      { instanceId: s.inst("kyo-placed-deck-card").instanceId, faceUp: false },
      { instanceId: s.inst("kyo-beatbreak-fodder").instanceId, faceUp: false },
    ]);
    expect(observe(s.engine).keywordAmount(s.perm("opponent-digimon"), "SecurityAttack")).toBe(-1);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it("Kyo gives Security A. -1 when an effect returns a security card to the deck", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT26-089", as: "kyo" }],
        security: [{ card: "BT1-009", as: "returned" }],
        deck: [{ card: "BT1-010", as: "placed" }],
      },
      1: { battleArea: [{ card: "BT1-030", as: "opponent-digimon" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();

  await advance(s.engine).verb.returnToDeck([s.inst("returned").instanceId], { toTop: false });

  expect(s.perm("kyo").isSuspended).toBe(true);
  expect(s.perm("kyo").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("placed").instanceId]);
  expect(observe(s.engine).keywordAmount(s.perm("opponent-digimon"), "SecurityAttack")).toBe(-1);
});
