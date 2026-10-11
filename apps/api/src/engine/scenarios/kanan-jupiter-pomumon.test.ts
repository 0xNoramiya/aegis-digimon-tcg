import fixtureKananJupiterPomumon from "./kanan-jupiter-pomumon.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("real arena turn offers and resolves Wide Plasment under Pomumon", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true });
  layScenarioFixture(s.state, fixtureKananJupiterPomumon, [BLUE_DECK, RED_DECK], true);
  const player = s.state.players[0]!;
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(5);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("kanan-titamon-card") })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.options?.candidateInstanceIds?.slice().sort()).toEqual([
      fixtureInstanceId("kanan-central-card"),
      fixtureInstanceId("kanan-jupiter-1-card"),
      fixtureInstanceId("kanan-jupiter-2-card"),
    ]);
    expect(s.state.memory).toBe(-5);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [fixtureInstanceId("kanan-jupiter-1-card")] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        player.trash.some((card) => card.instanceId === fixtureInstanceId("kanan-jupiter-1-card")) &&
        s.state.pendingDecision === undefined,
    );
    expect(player.security).toHaveLength(4);
    expect(player.hand.map((card) => card.instanceId)).toContain(fixtureInstanceId("kanan-jupiter-2-card"));
    expect(player.battleArea.some((p) => p.topCard.cardId === "BT9-047")).toBe(true);
    expect(player.battleArea.find((p) => p.topCard.cardId === "BT26-090")?.isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "memoryChanged", from: 5, to: -5 }));
  } finally {
    const pending = s.state.pendingDecision;
    if (pending?.kind === "selectCards") {
      s.engine.applyIntent(pending.seat, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      });
      await settle(() => s.state.pendingDecision === undefined);
    }
    // The next seat may already be waiting in breeding after the used Option finishes.
    if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
