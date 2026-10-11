import prepared0 from "./davis-ken-sources.fixture.js";
import { fixtureVariant, fixtureInstanceId } from "../scenario/references.js";

const preparedFixtures = { "davis-ken-sources": prepared0 };

import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { Phase, Zone } from "@aegis/shared";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../testkit/harness.js";

function board(counts = [2, 1, 1], decline = false) {
  return setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT16-085", as: "tamer" },
          { card: "BT1-037", as: "blue", under: ["BT1-030"] },
          { card: "BT1-071", as: "green", under: ["BT1-064"] },
        ],
        hand: [
          { card: "BT16-025", as: "dna" },
          { card: "BT3-027", as: "ordinary" },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: {
        battleArea: counts.map((count, index) => ({
          card: count === 2 ? "BT1-020" : "BT1-018",
          as: `host${index}`,
          under: count === 2 ? ["BT1-009", "BT1-018"] : Array(count).fill("BT1-009"),
        })),
        breeding: { card: "BT1-018", as: "breeding", under: ["BT1-009"] },
      },
    },
    decline ? { autoDeclineOptional: true } : { autoAcceptOptional: true },
  );
}

async function dna(s: EngineSetup) {
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      materialPermanentIds: [s.perm("blue").permanentId, s.perm("green").permanentId],
      instanceId: s.inst("dna").instanceId,
    }),
  ).toEqual({ ok: true });
}

describe("Feedback #90 BT16-085 any three opposing sources", () => {
  it("offers one physical-card pool across three hosts through public DNA and rejects illegal answers", async () => {
    const s = board();
    const hosts = [0, 1, 2].map((i) => s.perm(`host${i}`));
    const pool = hosts.flatMap((p) => p.stack.map((c) => c.instanceId));
    const ownSources = ["green", "blue"].flatMap((name) => {
      const p = s.perm(name);
      return [...p.stack.map((c) => c.instanceId), p.topCard.instanceId];
    });
    const breedingSources = s.perm("breeding").stack.map((c) => c.instanceId);
    await dna(s);
    await settle(() => !!s.state.pendingDecision);
    const decision = s.decisions.at(-1)!.req;
    // RED on the old module: it asks for one host instead of a pooled source choice.
    expect(decision.kind).toBe("selectCards");
    expect(decision.sourceCardId).toBe("BT16-085");
    expect(decision.options).toMatchObject({ min: 3, max: 3, candidateInstanceIds: pool });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    const respond = (instanceIds: string[]) =>
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds },
      });
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: pool.slice(0, 3) },
      }).ok,
    ).toBe(false);
    for (const invalid of [
      [],
      pool.slice(0, 2),
      [pool[0]!, pool[0]!, pool[1]!],
      [pool[0]!, pool[1]!, ownSources[0]!],
      [pool[0]!, pool[1]!, breedingSources[0]!],
      [pool[0]!, pool[1]!, hosts[0]!.topCard.instanceId],
      [pool[0]!, pool[1]!, "unknown-source"],
    ]) {
      expect(respond(invalid).ok).toBe(false);
      expect(s.state.pendingDecision?.decisionId).toBe(decision.decisionId);
      expect(s.state.players[1]!.trash).toHaveLength(0);
    }
    const chosen = [pool[0]!, pool[2]!, pool[3]!];
    expect(respond(chosen)).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.state.players[1]!.trash.length === 3);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toEqual(chosen);
    expect(hosts.map((p) => p.stack.map((c) => c.instanceId))).toEqual([[pool[1]], [], []]);
    expect(s.perm("breeding").stack.map((c) => c.instanceId)).toEqual(breedingSources);
    const result = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT16-025")!;
    expect(result.stack.map((c) => c.instanceId)).toEqual(ownSources);
    expect(result.isSuspended).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).not.toContain(s.inst("dna").instanceId);
    expect(s.decisions.filter((d) => d.req.sourceCardId === "BT16-085" && d.req.kind === "selectCards")).toHaveLength(
      1,
    );
    expect(respond(chosen).ok).toBe(false); // stale decision cannot pay or trash again
  });

  it("normalizes an overlong public answer to three distinct offered physical sources", async () => {
    const s = board();
    const hosts = [0, 1, 2].map((i) => s.perm(`host${i}`));
    const pool = hosts.flatMap((p) => p.stack.map((c) => c.instanceId));
    await dna(s);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.decisions.at(-1)!.req;
    // DecisionApi clamps valid distinct IDs to max; surplus IDs are never moved.
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: pool },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.state.players[1]!.trash.length === 3);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toEqual(pool.slice(0, 3));
    expect(hosts.flatMap((p) => p.stack.map((c) => c.instanceId))).toEqual(pool.slice(3));
    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it.each([{ counts: [1, 1] }, { counts: [1, 1, 1] }, { counts: [0, 0] }])(
    "trashes all available sources when the pool is $counts",
    async ({ counts }) => {
      const s = board(counts);
      const pool = counts.flatMap((_, i) => s.perm(`host${i}`).stack.map((c) => c.instanceId));
      await dna(s);
      await settle(() => s.perm("tamer").isSuspended && !s.state.pendingDecision);
      expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toEqual(pool);
      expect(counts.map((_, i) => s.perm(`host${i}`).stack.length)).toEqual(counts.map(() => 0));
      expect(s.state.memory).toBe(1);
      expect(s.perm("breeding").stack).toHaveLength(1);
    },
  );

  it("refusing the suspension cost skips both memory and source trash (Q2678)", async () => {
    const s = board(undefined, true);
    await dna(s);
    await settle(
      () => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT16-025") && !s.state.pendingDecision,
    );
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.decisions.some((d) => d.req.kind === "selectCards" && d.req.sourceCardId === "BT16-085")).toBe(false);
  });

  it("ordinary blue digivolution gains memory but never strips sources", async () => {
    const s = board();
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blue").permanentId,
        instanceId: s.inst("ordinary").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended && !s.state.pendingDecision);
    expect(s.state.memory).toBe(3); // paid 3, then gained 1
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.perm("blue").stack.map((c) => c.cardId)).toEqual(["BT1-030", "BT1-037"]);
  });

  it("an already suspended Tamer cannot pay again for a subsequent DNA", async () => {
    const s = board([1, 1, 1]);
    s.perm("tamer").isSuspended = true;
    await dna(s);
    await settle(
      () => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT16-025") && !s.state.pendingDecision,
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.decisions.filter((d) => d.req.sourceCardId === "BT16-085")).toHaveLength(0);
  });

  it("illegal DNA materials never pay the Tamer or move a source", async () => {
    const s = board();
    await s.ready();
    for (const materialPermanentIds of [
      [s.perm("blue").permanentId, s.perm("blue").permanentId],
      [s.perm("blue").permanentId, s.perm("host1").permanentId],
      [s.perm("blue").permanentId, s.perm("breeding").permanentId],
    ]) {
      expect(
        s.engine.applyIntent(0, { type: "dnaDigivolve", materialPermanentIds, instanceId: s.inst("dna").instanceId })
          .ok,
      ).toBe(false);
      expect(s.perm("tamer").isSuspended).toBe(false);
      expect(s.state.memory).toBe(0);
      expect(s.state.players[1]!.trash).toHaveLength(0);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.state.players[0]!.hand.map((c) => c.cardId)).toContain("BT16-025");
    }
  });

  it("ordinary red digivolution does not meet the blue-or-green trigger", async () => {
    const s = board();
    const red = s.putOnBoard(0, { card: "BT1-009", as: "red" });
    s.give(0, Zone.Hand, { card: "BT1-018", as: "redEvolution" });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: red.permanentId,
        instanceId: s.inst("redEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => red.topCard.cardId === "BT1-018" && !s.state.pendingDecision);
    expect(s.state.memory).toBe(3);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.decisions.some((d) => d.req.sourceCardId === "BT16-085")).toBe(false);
  });

  it("does not gain memory for ordinary blue digivolution in breeding", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-085", as: "tamer" }],
          breeding: { card: "BT1-030", as: "breeding" },
          hand: [{ card: "BT1-037", as: "blueEvolution" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true },
    );
    const breeding = s.perm("breeding");
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breeding.permanentId,
        instanceId: s.inst("blueEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => breeding.topCard.cardId === "BT1-037" && !s.state.pendingDecision);
    expect(s.state.memory).toBe(4);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("preserves printed X Antibody and Maquinamon host trash locks in the pooled selection", async () => {
    const s = board([1, 1]);
    const xHost = s.putOnBoard(1, { card: "BT1-020", as: "xHost", under: ["BT9-109", "BT1-009", "BT1-018"] });
    const lockedHost = s.putOnBoard(1, { card: "EX11-073", as: "lockedHost", under: ["EX11-070"] });
    const xId = xHost.stack[0]!.instanceId;
    const hostId = lockedHost.stack[0]!.instanceId;
    const legalId = s.perm("host0").stack[0]!.instanceId;
    await dna(s);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.decisions.at(-1)!.req;
    // These cards can be chosen, but the printed trash locks prevent their movement.
    expect(decision.options?.candidateInstanceIds).toEqual(expect.arrayContaining([xId, hostId, legalId]));
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [xId, hostId, legalId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.state.players[1]!.trash.length === 1);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toEqual([legalId]);
    expect(xHost.stack.map((c) => c.instanceId)).toContain(xId);
    expect(lockedHost.stack.map((c) => c.instanceId)).toEqual([hostId]);
    expect(s.state.memory).toBe(1);
  });

  it("playable arena pays for the Tamer, preserves material order, and advances turns naturally", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureVariant(preparedFixtures, "davis-ken-sources"));
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("feedback90-tamer") })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          human.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("feedback90-tamer")) &&
          !s.state.pendingDecision,
      );
      expect(s.state.memory).toBe(1);
      const blue = human.battleArea.find((p) => p.topCard.cardId === "BT1-037")!;
      const green = human.battleArea.find((p) => p.topCard.cardId === "BT1-071")!;
      const order = [
        ...green.stack.map((c) => c.instanceId),
        green.topCard.instanceId,
        ...blue.stack.map((c) => c.instanceId),
        blue.topCard.instanceId,
      ];
      const expectedTrash = [...s.state.players[1]!.battleArea]
        .flatMap((p) => p.stack.map((c) => c.instanceId))
        .slice(0, 3);
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          materialPermanentIds: [blue.permanentId, green.permanentId],
          instanceId: fixtureInstanceId("feedback90-dna"),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.trash.length === 3 && !s.state.pendingDecision);
      expect(s.state.memory).toBe(2);
      expect(
        human.battleArea
          .find((p) => p.topCard.instanceId === fixtureInstanceId("feedback90-dna"))!
          .stack.map((c) => c.instanceId),
      ).toEqual(order);
      expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toEqual(expectedTrash);
      expect(human.hand.map((c) => c.instanceId)).toEqual([
        fixtureInstanceId("github-effects-deck-0-0"),
        fixtureInstanceId("github-effects-deck-0-1"),
      ]);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(s.state.turnSeat).toBe(1);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
      expect(
        human.battleArea.find((p) => p.topCard.instanceId === fixtureInstanceId("feedback90-tamer"))!.isSuspended,
      ).toBe(false);
    } finally {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
