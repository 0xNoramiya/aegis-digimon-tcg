import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { settle, type EngineSetup } from "../testkit/harness.js";
import { setupScenario } from "../testkit/scenario.js";
import { linkCardTrashedWhenHostLeaves } from "./link-card-trashed-when-host-leaves.fixture.js";

type Destination = "deckBottom" | "hand" | "trash";

const removals: { removalCardId: string; removalCost: number; destination: Destination }[] = [
  { removalCardId: "EX9-020", removalCost: 7, destination: "deckBottom" },
  { removalCardId: "ST2-16", removalCost: 7, destination: "hand" },
  { removalCardId: "ST1-16", removalCost: 8, destination: "trash" },
];

async function withLinkedBootmon(removalCardId: string, verify: (s: EngineSetup) => Promise<void>) {
  const preferred: string[] = [];
  const s = setupScenario(linkCardTrashedWhenHostLeaves({ removalCardId }), {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoOrderTriggers: true,
    preferInstanceIds: preferred,
  });
  preferred.push(s.inst("logamon").instanceId, s.inst("bootmon").instanceId);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bootmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((permanent) =>
          permanent.linked.some((card) => card.instanceId === s.inst("logamon").instanceId),
        ),
    );
    await verify(s);
  } finally {
    if (!s.state.gameOver) {
      s.engine.applyIntent(s.state.turnSeat as 0 | 1, { type: "surrender" });
    }
    await loop;
  }
}

function getZoneIds(s: EngineSetup, zone: "deck" | "hand" | "trash"): string[] {
  return s.state.players[0]![zone].map((card) => card.instanceId);
}

type ExpectedZonesParams = {
  destination: Destination;
  bootmonId: string;
  firstDrawId: string;
  secondDrawId: string;
  remainingDeck: string[];
};

function getExpectedZones({ destination, bootmonId, firstDrawId, secondDrawId, remainingDeck }: ExpectedZonesParams) {
  if (destination === "deckBottom") {
    return { deck: [...remainingDeck, bootmonId], hand: [firstDrawId, secondDrawId], trash: [] };
  }
  if (destination === "hand") {
    return { deck: remainingDeck, hand: [firstDrawId, bootmonId, secondDrawId], trash: [] };
  }
  return { deck: remainingDeck, hand: [firstDrawId, secondDrawId], trash: [bootmonId] };
}

describe("link card of a Digimon that leaves the battle area", () => {
  it.each(removals)(
    "goes to the trash when $removalCardId sends its Digimon to $destination",
    async ({ removalCardId, removalCost, destination }) => {
      await withLinkedBootmon(removalCardId, async (s) => {
        const bootmonId = s.inst("bootmon").instanceId;
        const logamonId = s.inst("logamon").instanceId;
        const firstDrawId = s.inst("linkOwnerFirstDraw").instanceId;
        const linkOwner = s.state.players[0]!;
        expect(linkOwner.battleArea).toHaveLength(1);
        expect(linkOwner.battleArea[0]!.topCard.instanceId).toBe(bootmonId);
        expect(linkOwner.battleArea[0]!.linked.map((card) => card.instanceId)).toEqual([logamonId]);
        expect(getZoneIds(s, "hand")).toEqual([firstDrawId]);
        expect(s.state.memory).toBe(0);
        expect(s.state.turnSeat).toBe(0);

        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(1);
        expect(linkOwner.battleArea[0]!.linked.map((card) => card.instanceId)).toEqual([logamonId]);
        const deckBefore = getZoneIds(s, "deck");

        expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({
          ok: true,
        });
        await settle(
          () => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined,
        );
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.memory).toBe(removalCost - 3);

        const secondDrawId = deckBefore[0]!;
        const remainingDeck = deckBefore.slice(1);
        expect(linkOwner.battleArea).toHaveLength(0);
        expect(getZoneIds(s, "deck")).not.toContain(logamonId);
        expect(getZoneIds(s, "hand")).not.toContain(logamonId);
        const expected = getExpectedZones({ destination, bootmonId, firstDrawId, secondDrawId, remainingDeck });
        expect(getZoneIds(s, "deck")).toEqual(expected.deck);
        expect(getZoneIds(s, "hand")).toEqual(expected.hand);
        expect(getZoneIds(s, "trash").sort()).toEqual([...expected.trash, logamonId].sort());
      });
    },
  );
});
