import fixtureEx11CloseStartMainDecline from "./ex11-close-start-main-decline.fixture.js";
import fixtureP146ReloadPlugInFaceDown from "./p146-reload-plug-in-face-down.fixture.js";
import { fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("Oct 09 follow-up arena scenarios", () => {
  it("declines EX11-065 Close's Start of Main cost", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(s.state, fixtureEx11CloseStartMainDecline, [BLUE_DECK, RED_DECK], true);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.state.pendingDecision!;
    expect(JSON.parse(decision.payloadJson)).toMatchObject({
      candidateInstanceIds: [fixtureInstanceId("own-source-close-decline-gotsumon-0-card")],
      min: 0,
      max: 1,
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    expect(s.state.memory).toBe(3);
    expect(human.trash).toHaveLength(0);
    expect(human.battleArea.find(({ permanentId }) => permanentId.endsWith("-gotsumon"))!.stack).toHaveLength(1);
    expect(human.breeding!.stack.map(({ cardId }) => cardId)).toEqual(["EX8-005"]);
  });

  it("places P-146 face down at the security bottom", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureP146ReloadPlugInFaceDown, [BLUE_DECK, RED_DECK], true);
    s.engine.startTurnLoop();
    // No breeding Digimon and no Digi-Eggs: the engine passes Breeding by itself.
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    const hostId = fixturePermanentId("own-reload-plug-in-host");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: fixturePermanentId("opponent-reload-plug-in-wall") },
      }),
    ).toEqual({ ok: true });
    await settle(() => human.security.length === 6 && s.state.pendingDecision === undefined);

    expect(human.security.at(-1)).toMatchObject({ cardId: "P-146", faceUp: false });
    expect(human.security.every(({ faceUp }) => faceUp !== true)).toBe(true);
    expect(human.battleArea.find(({ permanentId }) => permanentId === hostId)?.stack).toHaveLength(0);
  });
});
