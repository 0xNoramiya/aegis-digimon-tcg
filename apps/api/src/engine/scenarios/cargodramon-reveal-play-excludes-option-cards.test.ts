import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/cargodramon-reveal-play-excludes-option-cards.fixture";
import "#api/cards/BT14/BT14-061";
import "#api/cards/BT14/BT14-064";
import "#api/cards/BT14/BT14-086";
import "#api/cards/BT14/BT14-098";
import "#api/cards/BT16/BT16-096";

async function digivolveIntoCargodramon(chosenAlias: string) {
  const s = setupScenario(fixture);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("vegiemon").permanentId,
      instanceId: s.inst("cargodramon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const selection = s.decisions.at(-1)!.req;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: selection.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst(chosenAlias).instanceId] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
  return { s, loop, selection };
}

it("Cargodramon's When Digivolving reveal offers only the Tamer and trashes revealed Options", async () => {
  const { s, loop, selection } = await digivolveIntoCargodramon("dcdBomb");
  try {
    expect(selection).toMatchObject({
      kind: "selectCards",
      sourceCardId: "BT14-064",
      options: { candidateInstanceIds: [s.inst("satsuki").instanceId], min: 0, max: 1 },
    });
    const human = s.state.players[0]!;
    const handIds = human.hand.map((card) => card.instanceId);
    expect(handIds).not.toContain(s.inst("dcdBomb").instanceId);
    expect(handIds).not.toContain(s.inst("crimeResponseTeam").instanceId);
    expect(human.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("dcdBomb").instanceId,
        s.inst("crimeResponseTeam").instanceId,
        s.inst("satsuki").instanceId,
      ]),
    );
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it("Cargodramon's When Digivolving reveal plays the chosen DigiPolice Tamer", async () => {
  const { s, loop } = await digivolveIntoCargodramon("satsuki");
  try {
    const human = s.state.players[0]!;
    expect(human.battleArea.map((permanent) => permanent.topCard?.instanceId)).toContain(s.inst("satsuki").instanceId);
    expect(human.hand.map((card) => card.instanceId)).not.toContain(s.inst("satsuki").instanceId);
    expect(human.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("dcdBomb").instanceId, s.inst("crimeResponseTeam").instanceId]),
    );
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
