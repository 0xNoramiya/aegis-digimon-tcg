import fixtureP240ArcturusmonVbRoutes from "./p240-arcturusmon-vb-routes.fixture.js";
import fixtureEx12ProximamonDualSiriusmon from "./ex12-proximamon-dual-siriusmon.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

function ownPermanentTopped(s: ReturnType<typeof setupEngine>, cardId: string) {
  const permanent = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === cardId);
  if (permanent === undefined) throw new Error(`no permanent topped by ${cardId}`);
  return permanent;
}

async function reachMainPhase(s: ReturnType<typeof setupEngine>): Promise<void> {
  s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
}

describe("Arcturusmon and Proximamon arena scenarios", () => {
  it("plays P-240 by Assembly -6, then digivolves another from a Red/Yellow [VB] Lv.5", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureP240ArcturusmonVbRoutes, [BLUE_DECK, RED_DECK], true);
    await reachMainPhase(s);
    const arcturusmonCount = () =>
      s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "P-240").length;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("arcturusmon-assembly-card"),
        assembly: {
          materialInstanceIds: [
            fixtureInstanceId("arcturusmon-material-5-card"),
            fixtureInstanceId("arcturusmon-material-4-card"),
            fixtureInstanceId("arcturusmon-material-3-card"),
          ],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => arcturusmonCount() === 1 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(4);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ownPermanentTopped(s, "EX12-014").permanentId,
        instanceId: fixtureInstanceId("arcturusmon-digivolve-card"),
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => arcturusmonCount() === 2 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
  });

  it("lets Proximamon use the DUAL Siriusmon it digivolved from as an Option", async () => {
    const siriusmonInstanceId = fixtureInstanceId("own-card-proximamon-siriusmon-card");
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [siriusmonInstanceId] },
    );
    layScenarioFixture(s.state, fixtureEx12ProximamonDualSiriusmon, [BLUE_DECK, RED_DECK], true);
    await reachMainPhase(s);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ownPermanentTopped(s, "EX12-018").permanentId,
        instanceId: fixtureInstanceId("proximamon-card"),
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every(({ topCard }) => topCard.cardId !== "BT1-020"));

    const sourcePicker = s.decisions.find(({ req }) =>
      (req.options as { candidateInstanceIds?: string[] } | undefined)?.candidateInstanceIds?.includes(
        siriusmonInstanceId,
      ),
    );
    const candidates = (sourcePicker!.req.options as { candidateInstanceIds: string[] }).candidateInstanceIds;
    expect(candidates).toEqual(
      expect.arrayContaining([
        fixtureInstanceId("own-source-proximamon-siriusmon-1-card"),
        fixtureInstanceId("own-source-proximamon-canoweissmon-1-card"),
      ]),
    );
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-020");
    expect(ownPermanentTopped(s, "EX12-077").stack.map(({ instanceId }) => instanceId)).not.toContain(
      siriusmonInstanceId,
    );
  });
});
