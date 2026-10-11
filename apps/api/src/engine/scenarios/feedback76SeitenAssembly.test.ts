import prepared0 from "./seiten-assembly.fixture.js";
import { fixtureVariant, fixtureInstanceId } from "../scenario/references.js";

import { expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle } from "../testkit/harness.js";
import { layScenarioFixture } from "../scenario/fixture.js";

import { advance } from "../testkit/advance.js";
import { playByAssembly } from "../testkit/assembly.js";
import "../../cards/index.js";

const preparedFixtures = { "seiten-assembly": prepared0 };

it("Feedback #76: another SeitenGokuumon is not exact Gokuumon Assembly material", async () => {
  const { s, result } = await playByAssembly("EX12-048", ["EX12-048", "EX12-029", "EX12-056"], 7);
  expect(result).toEqual({ ok: false, reason: "invalid-material" });
  expect(s.state.memory).toBe(7);
  expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("source").instanceId]);
  expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
    [0, 1, 2].map((index) => s.inst(`material-${index}`).instanceId),
  );
  expect(s.state.players[0]!.battleArea).toHaveLength(0);
});

it.each([
  ["duplicate allowed name", ["EX12-015", "BT12-039", "EX12-029"]],
  ["two materials", ["EX12-015", "EX12-029"]],
  ["four materials", ["EX12-015", "EX12-029", "EX12-056", "EX12-045"]],
  ["unrelated name", ["BT1-009", "EX12-029", "EX12-056"]],
] as const)("Feedback #76: rejects %s without spending or moving cards", async (_label, materials) => {
  const { s, result } = await playByAssembly("EX12-048", materials, 7);
  expect(result).toEqual({ ok: false, reason: "invalid-material" });
  expect(s.state.memory).toBe(7);
  expect(s.state.players[0]!.battleArea).toHaveLength(0);
  expect(s.state.players[0]!.hand).toHaveLength(1);
  expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
    materials.map((_, index) => s.inst(`material-${index}`).instanceId),
  );
});

const EXACT = ["EX12-015", "EX12-029", "EX12-056", "EX12-045"] as const;
it.each([0, 1, 2, 3])("Feedback #76: any three exact different names are legal, omitting slot %s", async (omit) => {
  const materials = EXACT.filter((_, index) => index !== omit);
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "EX12-048", as: "seiten" }],
        trash: materials.map((card, index) => ({ card, as: `material-${index}` })),
      },
    },
    { autoDeclineOptional: true, autoSelectCards: true },
  );
  s.state.memory = 7;
  await s.ready();
  const ids = materials.map((_, index) => s.inst(`material-${index}`).instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("seiten").instanceId,
      assembly: { materialInstanceIds: ids },
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.memory).toBe(0);
  expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.instanceId)).toEqual([...ids].reverse());
  expect(s.state.players[0]!.trash).toHaveLength(0);
  expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(0);
});

it.each([true, false])(
  "Feedback #76: real turn Assembly %s pays once, preserves excluded self and resolves scaled effect",
  async (assembly) => {
    const s = setupEngine({ autoDeclineOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureVariant(preparedFixtures, "seiten-assembly"));
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const ids = [
        fixtureInstanceId("feedback76-gokuu"),
        fixtureInstanceId("feedback76-sago"),
        fixtureInstanceId("feedback76-cho"),
      ];
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: fixtureInstanceId("feedback76-seiten"),
          ...(assembly ? { assembly: { materialInstanceIds: ids } } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
      const seiten = s.state.players[0]!.battleArea.find(
        (p) => p.topCard.instanceId === fixtureInstanceId("feedback76-seiten"),
      )!;
      expect(seiten.stack.map((card) => card.instanceId)).toEqual(assembly ? [...ids].reverse() : []);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
        assembly ? [fixtureInstanceId("feedback76-self")] : [fixtureInstanceId("feedback76-self"), ...ids],
      );
      expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(assembly ? 3000 : 12000);
      expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(0);
      expect(
        s.events.flatMap((event) =>
          event.kind === "memoryChanged" && event.reason === "payCost" ? [[event.from, event.to]] : [],
        ),
      ).toEqual([[10, assembly ? 3 : -3]]);
      expect(s.state.turnSeat).toBe(assembly ? 0 : 1);
      expect(s.state.memory).toBe(3);
      if (assembly) s.engine.applyIntent(0, { type: "endPhase" });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.state.memory).toBe(3);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(assembly ? 3000 : 12000);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
      expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(20000);
    } finally {
      if (s.state.phase === Phase.Breeding) {
        s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
        await advance(s.engine).waitForMainPhase(s.state.turnSeat);
      }
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);

it("Feedback #76: Hakubamon effect play offers only exact materials and combines its two-memory discount once", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX12-043", as: "hakuba" }],
        hand: [{ card: "EX12-048", as: "seiten" }],
        trash: [
          { card: "EX12-048", as: "self" },
          ...["EX12-015", "EX12-029", "EX12-056"].map((card, index) => ({ card, as: `valid-${index}` })),
        ],
      },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      declinePrompts: ["Attack with this Digimon"],
    },
  );
  s.state.memory = 10;
  await s.ready();
  const key: string = JSON.parse(s.perm("hakuba").activatableEffectsJson)[0].effectKey;
  expect(
    s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.inst("hakuba").instanceId, effectKey: key }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX12-043") &&
      !s.state.pendingDecision,
  );
  const picker = s.decisions.find(({ req }) => req.options?.assemblyCardId === "EX12-048")!.req;
  const ids = [0, 1, 2].map((index) => s.inst(`valid-${index}`).instanceId);
  expect(picker.options?.candidateInstanceIds).toEqual(ids);
  expect(picker.options?.candidateInstanceIds).not.toContain(s.inst("self").instanceId);
  expect(
    s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX12-048")!.stack.map((card) => card.instanceId),
  ).toEqual([...ids].reverse());
  expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("self").instanceId]);
  expect(s.state.memory).toBe(5);
  expect(
    s.events.flatMap((event) =>
      event.kind === "memoryChanged" && event.reason === "playCard" ? [[event.from, event.to]] : [],
    ),
  ).toEqual([[10, 5]]);
});
