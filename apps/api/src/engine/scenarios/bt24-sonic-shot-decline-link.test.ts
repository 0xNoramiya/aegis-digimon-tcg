import fixtureBt24SonicShotDeclineLink from "./bt24-sonic-shot-decline-link.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("BT24 Sonic Shot Link recipient arena scenario", () => {
  it.each([false, true])("Dan & Kanan continues after Sonic Shot's Link selection (link=%s)", async (link) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true });
    layScenarioFixture(s.state, fixtureBt24SonicShotDeclineLink, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.decisions.at(-1)?.req).toMatchObject({
      sourceCardId: "BT24-085",
      options: { candidateInstanceIds: [fixtureInstanceId("sonic-shot-option-card")] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [fixtureInstanceId("sonic-shot-option-card")] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const hosts = s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT24-009");
    expect(s.decisions.at(-1)?.req).toMatchObject({
      sourceCardId: "BT24-095",
      options: { min: 0, max: 1, candidateInstanceIds: hosts.map(({ permanentId }) => permanentId) },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: link ? [hosts[0]!.permanentId] : [] },
      }),
    ).toEqual({ ok: true });

    await settle(
      () => s.state.pendingDecision?.kind === "chooseTargets" && s.decisions.at(-1)?.req.sourceCardId === "BT24-085",
    );
    expect(s.decisions.at(-1)?.req.options?.selectionContext).toBe("attackSource");
    expect(hosts[0]!.linked.map(({ instanceId }) => instanceId)).toEqual(
      link ? [fixtureInstanceId("sonic-shot-option-card")] : [],
    );
    expect(hosts[1]!.linked).toHaveLength(0);
    expect(
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === fixtureInstanceId("sonic-shot-option-card")),
    ).toBe(!link);
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "effectResolved", sourceCardId: "BT24-095" }));
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "cardsMoved",
        instanceIds: [fixtureInstanceId("sonic-shot-option-card")],
        to: link ? "linkedCards" : "trash",
        optionUsed: true,
      }),
    );
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
