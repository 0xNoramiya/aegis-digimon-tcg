import fixtureShoutmonTrashBt21 from "./shoutmon-trash-bt21.fixture.js";
import fixtureShoutmonTrashBt12 from "./shoutmon-trash-bt12.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../testkit/harness.js";

describe("paid Shoutmon trash DigiXros permission", () => {
  it.each(["BT21-030", "BT12-112"])("offers %s's paid permission before the manual material choice", async (card) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon", under: [{ card: "BT10-008", as: "source" }] }],
          hand: [{ card, as: "superior" }],
          trash: [{ card: "BT10-007", as: "trashMaterial" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("superior").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("superior").instanceId),
    );
    await drainMicrotasks();
    const picker = s.decisions.find(({ req }) => req.options?.digiXrosCardId === card);
    expect(picker, "manual play must ask for materials after paying the printed cost").toBeDefined();
    expect(picker!.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("source").instanceId, s.inst("trashMaterial").instanceId]),
    );
    expect(picker!.req.options?.candidateInstanceIds).not.toContain(s.inst("shoutmon").instanceId);
    const superior = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === card)!;
    expect(superior.stack.map((c) => c.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("shoutmon").instanceId,
        s.inst("source").instanceId,
        s.inst("trashMaterial").instanceId,
      ]),
    );
    expect(s.state.memory).toBe(-2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it.each(["BT21-030", "BT12-112"])("refuses %s's unpaid explicit trash payload", async (card) => {
    const s = setupEngine({ 0: { hand: [{ card, as: "superior" }], trash: [{ card: "BT10-007", as: "material" }] } });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("superior").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("superior").instanceId);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([s.inst("material").instanceId]);
  });
  it.each(["BT21-030", "BT12-112"])("declining %s's clause grants no trash and never reoffers it", async (card) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon", under: [{ card: "BT10-008", as: "source" }] }],
          hand: [{ card, as: "superior" }],
          trash: [{ card: "BT10-007", as: "material" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("superior").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "actionRejected"));
    await drainMicrotasks();
    expect(s.state.memory).toBe(10);
    expect(s.perm("shoutmon").stack.map((c) => c.instanceId)).toEqual([s.inst("source").instanceId]);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([s.inst("material").instanceId]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    // A new attempt must offer the payment again; the declined receipt must not leak.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("superior").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length === 2);
    await drainMicrotasks();
  });

  it.each(["BT21-030", "BT12-112"])(
    "keeps %s's paid placement and discount when DigiXros is declined",
    async (card) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT21-011", as: "shoutmon" }],
            hand: [{ card, as: "superior" }],
            trash: ["BT10-007"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("superior").instanceId })).toEqual({
        ok: true,
      });
      await settle(() =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("superior").instanceId),
      );
      await drainMicrotasks();
      const superior = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === card)!;
      expect(superior.stack.map((c) => c.instanceId)).toEqual([s.inst("shoutmon").instanceId]);
      expect(s.state.memory).toBe(-4);
      expect(s.state.players[0]!.trash.map((c) => c.cardId)).toEqual(["BT10-007"]);
      expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    },
  );

  it.each(["BT21-030", "BT12-112"])("admits %s at zero memory only through its final paid discount", async (card) => {
    const materials = ["BT10-007", "BT10-008", "BT10-009", "BT10-012"];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon" }],
          hand: [{ card, as: "superior" }],
          trash: materials.map((materialCard, index) => ({ card: materialCard, as: `material${index}` })),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("superior").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("superior").instanceId),
    );
    await drainMicrotasks();
    expect(s.state.memory).toBe(-10);
    const superior = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === card)!;
    expect(superior.stack.map((c) => c.cardId).sort()).toEqual([...materials, "BT21-011"].sort());
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
  });

  it("refuses an impossible manual play without paying the optional clause", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon", under: ["BT1-009"] }],
          hand: [{ card: "BT21-030", as: "superior" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("superior").instanceId })).toMatchObject({
      ok: false,
    });
    expect(s.decisions).toHaveLength(0);
    expect(s.perm("shoutmon").stack.map((c) => c.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("rejects the already-paid Shoutmon top as an extra DigiXros material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon" }],
          hand: [{ card: "BT21-030", as: "superior" }],
          trash: [{ card: "BT10-007", as: "material" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("superior").instanceId,
        digiXros: { materialInstanceIds: [s.inst("shoutmon").instanceId, s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "actionRejected"));
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("superior").instanceId);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([s.inst("material").instanceId]);
  });
  it.each([fixtureShoutmonTrashBt21, fixtureShoutmonTrashBt12] as const)(
    "runs the playable %s fixture through its authoritative picker",
    async (scenarioId) => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
      layScenarioFixture(s.state, scenarioId, [BLUE_DECK, RED_DECK], true);
      const human = s.state.players[0]!;
      const shoutmon = human.battleArea.find((p) => p.topCard.cardId === "BT21-011")!;
      const sourceId = shoutmon.stack[0]!.instanceId;
      const tamer = human.battleArea.find((p) => p.topCard.cardId === "BT1-085")!;
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("superior-card") })).toEqual({
          ok: true,
        });
        await settle(
          () =>
            human.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("superior-card")) &&
            !s.state.pendingDecision,
        );
        await drainMicrotasks();
        const played = human.battleArea.find((p) => p.topCard.instanceId === fixtureInstanceId("superior-card"))!;
        expect(played.stack.map((c) => c.instanceId).sort()).toEqual(
          [
            shoutmon.topCard.instanceId,
            sourceId,
            fixtureInstanceId("hand-card"),
            fixtureInstanceId("trash-0-card"),
            fixtureInstanceId("trash-1-card"),
            fixtureInstanceId("trash-2-card"),
          ].sort(),
        );
        expect(s.state.memory).toBe(1);
        expect(s.state.turnSeat).toBe(0);
        expect(tamer.stack.map((c) => c.cardId)).toEqual(["BT10-015"]);
        expect(human.trash).toHaveLength(0);
        expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
        const optionalIndex = s.decisions.findIndex(({ req }) => req.kind === "optional");
        const materialIndex = s.decisions.findIndex(({ req }) => req.options?.digiXrosCardId);
        expect(optionalIndex).toBeLessThan(materialIndex);
        expect(s.events.filter((event) => event.kind === "actionRejected")).toHaveLength(0);
        if (scenarioId.name?.endsWith("bt21")) {
          const securityBefore = s.state.players[1]!.security.length;
          expect(
            s.engine.applyIntent(0, {
              type: "attack",
              attackerPermanentId: played.permanentId,
              target: { kind: "player" },
            }),
          ).toEqual({ ok: true });
          await advance(s.engine).finishAttack();
          expect(played.isSuspended).toBe(true);
          expect(s.state.players[1]!.security.length).toBe(securityBefore - 2);
        }
      } finally {
        if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );

  it("passes the turn after the final no-DigiXros cost crosses memory", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true });
    layScenarioFixture(s.state, fixtureShoutmonTrashBt21, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("superior-card") })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("superior-card")) &&
          !s.state.pendingDecision,
      );
      await drainMicrotasks();
      expect(s.state.memory).toBe(4);
      expect(s.state.turnSeat).toBe(1);
      const superior = s.state.players[0]!.battleArea.find(
        (p) => p.topCard.instanceId === fixtureInstanceId("superior-card"),
      )!;
      expect(superior.stack.map((c) => c.cardId)).toEqual(["BT21-011"]);
    } finally {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("rejects the cap boundary instead of counting the paid Shoutmon twice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon", under: ["BT1-009"] }],
          hand: [{ card: "BT21-030", as: "superior" }],
          trash: ["BT10-007", "BT10-009", "BT10-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("superior").instanceId })).toMatchObject({
      ok: false,
    });
    expect(s.decisions).toHaveLength(0);
    expect(s.perm("shoutmon").stack.map((c) => c.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash.map((c) => c.cardId)).toEqual(["BT10-007", "BT10-009", "BT10-012"]);
    expect(s.state.memory).toBe(0);
  });

  it("rejects an impossible union of sources from two different candidate Shoutmons", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-011", as: "first", under: ["BT10-007", "BT10-009"] },
            { card: "BT21-011", as: "second", under: ["BT10-012", "BT10-013"] },
          ],
          hand: [{ card: "BT21-030", as: "superior" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("superior").instanceId })).toMatchObject({
      ok: false,
    });
    expect(s.decisions).toHaveLength(0);
    expect(s.perm("first").stack).toHaveLength(2);
    expect(s.perm("second").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });
});
