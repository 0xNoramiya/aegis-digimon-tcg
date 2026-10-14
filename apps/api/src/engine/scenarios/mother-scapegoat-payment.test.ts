import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/mother-scapegoat-payment.fixture";
import unpaidFixture from "#api/engine/scenarios/scapegoat-unpaid-deletion.fixture";
import "#api/cards/EX12/EX12-035";
import "#api/cards/EX2/EX2-007";
import "#api/cards/LM/LM-043";
import "#api/cards/ST1/ST1-16";
import "#api/cards/EX11/EX11-023";
import type { ScenarioFixture } from "#api/engine/scenario/types";

function fixtureWithHolder(card: string): ScenarioFixture {
  return {
    ...fixture,
    board: {
      ...fixture.board,
      0: {
        ...fixture.board[0],
        battleArea: [
          { card, as: "holder", suspended: true },
          { card: "EX2-007", as: "mother" },
        ],
      },
    },
  };
}

it.each([
  { cause: "effect", holder: "LM-043" },
  { cause: "battle", holder: "LM-043" },
  { cause: "effect", holder: "EX11-023" },
  { cause: "battle", holder: "EX11-023" },
])("$holder pays Scapegoat by deleting Mother when preventing $cause deletion", async ({ cause, holder }) => {
  const s = setupScenario(fixtureWithHolder(holder));
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(1);
    if (cause === "effect") {
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "chooseTargets", instanceIds: [s.perm("holder").permanentId] },
        }),
      ).toEqual({ ok: true });
    } else {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("holder").permanentId },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("mother").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "deletionPrevented" && event.keyword === "Scapegoat") &&
        !s.state.pendingDecision &&
        !s.state.combatWindow,
    );
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([holder]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("mother").instanceId)).toBe(true);
  } finally {
    s.engine.applyIntent(1, { type: "surrender" });
    await loop;
  }
});

it("Scapegoat cannot prevent deletion when the selected cost Digimon evades", async () => {
  const s = setupScenario(unpaidFixture);
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("holder").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("sacrifice").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.combatWindow?.kind === "evade");
    expect(
      s.engine.applyIntent(0, { type: "respondEvade", permanentId: s.perm("sacrifice").permanentId, accept: true }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("holder").instanceId) &&
        !s.state.pendingDecision &&
        !s.state.combatWindow,
    );
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX12-035"]);
    expect(
      s.events.filter((event) => event.kind === "deletionPrevented" && event.keyword === "Scapegoat"),
    ).toHaveLength(0);
  } finally {
    s.engine.applyIntent(1, { type: "surrender" });
    await loop;
  }
});
