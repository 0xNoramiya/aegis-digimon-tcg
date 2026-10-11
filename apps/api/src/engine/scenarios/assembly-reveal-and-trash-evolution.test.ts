import { fixtureZoneId } from "../scenario/references.js";
import { fixtureVariant } from "../scenario/references.js";
import fixtureLarvaBreeding from "./larva-breeding.fixture.js";
import fixtureAlterSSources from "./alter-s-sources.fixture.js";
import fixtureMeltingTrash from "./melting-trash.fixture.js";
import fixtureHyogamonTrash from "./hyogamon-trash.fixture.js";
import fixtureGoblimonTrash from "./goblimon-trash.fixture.js";
import fixtureUlforceGold from "./ulforce-gold.fixture.js";
import fixtureUlforceBt13 from "./ulforce-bt13.fixture.js";
import fixtureUlforceBt11 from "./ulforce-bt11.fixture.js";
import fixtureCraniamon from "./craniamon.fixture.js";
import fixtureSlayerdramon from "./slayerdramon.fixture.js";
import fixtureBreakdramon from "./breakdramon.fixture.js";
import fixtureMerciful from "./merciful.fixture.js";
import fixtureDantemonAlternative from "./dantemon-alternative.fixture.js";
import fixtureGiantSlayer from "./giant-slayer.fixture.js";

import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture, type ScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

async function staged(slug: string, breeding = false, accept = false) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoDeclineOptional: !accept,
      autoAcceptOptional: accept,
      autoSelectCards: true,
      autoChooseOption: true,
      autoOrderTriggers: true,
    },
  );
  const id = fixtureVariant(
    {
      "larva-breeding": fixtureLarvaBreeding,
      "alter-s-sources": fixtureAlterSSources,
      "melting-trash": fixtureMeltingTrash,
      "hyogamon-trash": fixtureHyogamonTrash,
      "goblimon-trash": fixtureGoblimonTrash,
      "ulforce-gold": fixtureUlforceGold,
      "ulforce-bt13": fixtureUlforceBt13,
      "ulforce-bt11": fixtureUlforceBt11,
      craniamon: fixtureCraniamon,
      slayerdramon: fixtureSlayerdramon,
      breakdramon: fixtureBreakdramon,
      merciful: fixtureMerciful,
      "dantemon-alternative": fixtureDantemonAlternative,
      "giant-slayer": fixtureGiantSlayer,
    },
    slug,
  ) as ScenarioFixture;
  layScenarioFixture(s.state, id, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  const result = breeding ? undefined : s.engine.applyIntent(0, { type: "endPhase" });
  expect(result).toEqual(breeding ? undefined : { ok: true });
  if (!breeding) {
    await advance(s.engine).waitForMainPhase(0);
  }
  return { s, loop, id };
}

const ASSEMBLY = [
  ["ulforce-gold", "EX13-023", 3, 7],
  ["craniamon", "EX13-062", 3, 7],
  ["slayerdramon", "EX13-024", 3, 7],
  ["breakdramon", "EX13-044", 3, 7],
  ["merciful", "EX13-077", 6, 8],
  ["dantemon-alternative", "BT26-086", 7, 7],
  ["giant-slayer", "BT26-085", 5, 7],
] as const;

describe("playable scenarios", () => {
  it.each(ASSEMBLY)("#%s consumes exactly the printed materials for %s", async (slug, card, count, cost) => {
    const { s, loop, id } = await staged(slug);
    const human = s.state.players[0]!;
    const materials = human.trash.map(({ instanceId }) => instanceId);
    expect(materials).toHaveLength(count);
    // A partial declaration must neither spend memory nor consume materials.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureZoneId(id, 0, "hand", 0),
        assembly: { materialInstanceIds: materials.slice(1) },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.memory).toBe(10);
    expect(human.trash).toHaveLength(count);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureZoneId(id, 0, "hand", 0),
        assembly: { materialInstanceIds: materials },
      }),
    ).toEqual({ ok: true });
    await settle(() => human.battleArea.some(({ topCard }) => topCard.cardId === card) && !s.state.pendingDecision);
    expect(
      human.battleArea
        .find(({ topCard }) => topCard.cardId === card)!
        .stack.map(({ instanceId }) => instanceId)
        .sort(),
    ).toEqual([...materials].sort());
    expect(human.trash).toHaveLength(0);
    expect(s.state.memory).toBe(10 - cost);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each(["ulforce-bt13", "ulforce-bt11"])("#%s does not invent Assembly on an older Ulforce", async (slug) => {
    const { s, loop, id } = await staged(slug);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureZoneId(id, 0, "hand", 0),
        assembly: { materialInstanceIds: s.state.players[0]!.trash.map(({ instanceId }) => instanceId) },
      }),
    ).toEqual({ ok: false, reason: "not-assembly" });
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("moves Larva and opens Main with its deletion protection active", async () => {
    const { s, loop } = await staged("larva-breeding", true);
    const larva = s.state.players[0]!.breeding!;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: larva.permanentId })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.battleArea).toContain(larva);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each(["hyogamon-trash", "goblimon-trash"])(
    "#%s evolves only its inherited host from trash after a public hand discard",
    async (slug) => {
      const { s, loop, id } = await staged(slug, false, true);
      const host = s.state.players[0]!.battleArea[0]!;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureZoneId(id, 0, "hand", 0) })).toEqual({
        ok: true,
      });
      await settle(() => host.topCard.cardId === "P-209" && !s.state.pendingDecision);
      expect(host.stack.map(({ cardId }) => cardId)).toEqual([
        slug.includes("hyogamon") ? "BT24-026" : "BT24-042",
        "BT24-072",
      ]);
      expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === fixtureZoneId(id, 0, "trash", 0))).toBe(
        false,
      );
      expect(s.state.memory).toBe(4);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  );

  it("activates the battle-area emblem to evolve a trash LIBERATOR", async () => {
    const { s, loop, id } = await staged("melting-trash", false, true);
    const host = s.state.players[0]!.battleArea[1]!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureZoneId(id, 0, "hand", 0) })).toEqual({
      ok: true,
    });
    await settle(() => host.topCard.cardId === "BT19-053" && !s.state.pendingDecision);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT19-053", "P-232"]);
    expect(s.state.memory).toBe(5);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays both source cards after a public attack without a softlock", async () => {
    const { s, loop } = await staged("alter-s-sources", false, true);
    const host = s.state.players[0]!.battleArea[0]!;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security[0]?.cardId === "EX9-021" &&
        !s.state.pendingDecision &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(["AD1-001", "AD1-010"]);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
