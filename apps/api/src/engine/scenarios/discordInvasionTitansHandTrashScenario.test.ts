import { readFileSync } from "node:fs";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { runReplay, type ReplayRecord } from "../../replays/inputs/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("Discord 1558856866413412413: Invasion of the Titans discards newly drawn Ogres", () => {
  it.each(["BT24-013", "BT24-026", "BT24-045", "BT26-069", "BT14-100", "BT6-108", "BT7-076"])(
    "draws once after discarding a newly drawn %s and another Digimon",
    async (cardId) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT24-042", as: "purpleSource" }],
            hand: [
              { card: "BT24-098", as: "invasion" },
              { card: "BT1-009", as: "discard" },
              "BT1-010",
              "BT1-011",
              "BT1-012",
            ],
            deck: [
              { card: cardId, as: "ogre" },
              { card: "BT1-014", as: "optionDraw" },
              { card: "BT1-015", as: "ogreDraw" },
            ],
          },
        },
        { autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("ogre").instanceId, s.inst("discard").instanceId);
      s.state.memory = 5;
      await s.ready();
      const invasionId = s.inst("invasion").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: invasionId })).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === invasionId) && !s.state.pendingDecision,
      );
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([
        s.inst("discard").instanceId,
        s.inst("ogre").instanceId,
      ]);
      expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("ogreDraw").instanceId);
      expect(s.state.players[0]!.hand).toHaveLength(5);
      expect(s.state.memory).toBe(2);
    },
  );

  it.each(["BT24-013", "BT24-026", "BT24-045", "BT26-069"])(
    "does not draw for newly drawn %s when six cards remain",
    async (cardId) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: ["BT24-042"],
            hand: [
              { card: "BT24-098", as: "invasion" },
              { card: "BT1-009", as: "discard" },
              ...Array<string>(5).fill("BT1-010"),
            ],
            deck: [{ card: cardId, as: "ogre" }, "BT1-011", { card: "BT1-012", as: "extra" }],
          },
        },
        { autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("ogre").instanceId, s.inst("discard").instanceId);
      s.state.memory = 5;
      await s.ready();
      const invasionId = s.inst("invasion").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: invasionId })).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === invasionId) && !s.state.pendingDecision,
      );
      expect(s.state.players[0]!.hand).toHaveLength(6);
      expect(s.state.players[0]!.deck.map((c) => c.instanceId)).toEqual([s.inst("extra").instanceId]);
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([
        s.inst("discard").instanceId,
        s.inst("ogre").instanceId,
      ]);
    },
  );

  it("replays the matching production discard without divergence before input 10, then draws for Ogremon", async () => {
    // Matching symptom found in VPS logs; the Discord report contains no player or match ID.
    // The scaffold fixture contains only inputs 0..10, with no names, chat or accounts.
    const record = JSON.parse(
      readFileSync(new URL("./discordInvasionTitansHandTrashScenario.replay.json", import.meta.url), "utf8"),
    ) as ReplayRecord;
    const replay = await runReplay(record, { untilInput: 10 });
    expect(replay.divergences).toEqual([]);
    const player = replay.state.players[0]!;
    expect(player.hand).toHaveLength(6);
    expect(player.hand.find((c) => c.instanceId === "s0-13")?.cardId).toBe("BT24-045");
    const bonusId = player.deck[0]!.instanceId;
    expect(
      await replay.applyIntent(0, {
        type: "respondDecision",
        decisionId: "dec-1",
        response: { kind: "selectCards", instanceIds: ["s0-19", "s0-13"] },
      }),
    ).toEqual({ ok: true });
    expect(player.trash.map((c) => c.instanceId)).toEqual(["s0-19", "s0-13"]);
    expect(player.hand).toHaveLength(5);
    expect(player.hand.map((c) => c.instanceId)).toContain(bonusId);
    expect(player.battleArea.map((p) => p.topCard.instanceId)).toEqual(["s0-40"]);
    expect(player.security).toHaveLength(5);
    expect(replay.state.pendingDecision).toBeUndefined();
    expect(replay.state.turnSeat).toBe(1);
    expect(replay.state.memory).toBe(3);
    await replay.applyIntent(1, { type: "surrender" });
  });

  it.each([
    ["arena-discord-invasion-titans-fugamon", false],
    ["arena-discord-invasion-titans-hyogamon", false],
    ["arena-discord-invasion-titans-ogremon", false],
    ["arena-discord-invasion-titans-two-ogres", true],
  ] as const)("resolves the playable layout %s through the natural turn loop", async (scenarioId, twoOgres) => {
    const preferred = ["dev-invasion-deck-0-1", twoOgres ? "dev-invasion-deck-0-2" : "dev-invasion-hand-1"];
    const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, preferInstanceIds: preferred });
    layDevScenario(scenarioId, s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const deckBefore = s.state.players[0]!.deck.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-invasion-hand-0" })).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.hand.some((c) => c.instanceId === "dev-invasion-deck-0-3") && !s.state.pendingDecision,
    );
    expect(s.state.players[0]!.hand).toHaveLength(twoOgres ? 6 : 5);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 3);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === "dev-invasion-deck-0-4")).toBe(false);
    expect(s.state.memory).toBe(2);
    expect(s.state.turnSeat).toBe(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
