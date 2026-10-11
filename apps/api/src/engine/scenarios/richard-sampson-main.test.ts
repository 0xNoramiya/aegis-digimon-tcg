import fixtureRichardMainMaterialsFaceDown from "./richard-main-materials-face-down.fixture.js";
import fixtureRichardMainFreshMaterials from "./richard-main-fresh-materials.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

// Discord thread 1558451244815880332: "I cannot choose to activate [EX13-071 Richard Sampson's] [Main] effect."
const RICHARD = "EX13-071";
const KUDAMON = "EX13-026";
const KENTAUROSMON = "BT3-043";
const REPPAMON = "EX13-030";
const CHIRINMON = "EX13-032";

type Setup = ReturnType<typeof setupEngine>;

function mainEffectKeys(s: Setup, alias: string): string[] {
  return (observe(s.engine).activatableEffects(s.perm(alias)) as { effectKey: string }[]).map(
    ({ effectKey }) => effectKey,
  );
}

function activate(s: Setup, alias: string): unknown {
  const [effectKey] = mainEffectKeys(s, alias);
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm(alias).topCard.instanceId,
    effectKey: effectKey!,
  });
}

describe("EX13-071 Richard Sampson [Main] activation", () => {
  it("Q7447: is not offered when the level 4 and level 5 materials are only face down under the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: RICHARD,
              as: "richard",
              under: [
                { card: REPPAMON, as: "fdReppamon", faceUp: false },
                { card: CHIRINMON, as: "fdChirinmon", faceUp: false },
                { card: "BT1-009", as: "fdFiller", faceUp: false },
              ],
            },
            { card: KUDAMON, as: "kudamon" },
          ],
          hand: [{ card: KENTAUROSMON, as: "kentaurosmon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(mainEffectKeys(s, "richard")).toHaveLength(0);
  });

  it("Q7447: once offered, the player may stack the materials it just trashed from under the Tamer", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: RICHARD,
              as: "richard",
              under: [
                { card: REPPAMON, as: "fdReppamon", faceUp: false },
                { card: CHIRINMON, as: "fdChirinmon", faceUp: false },
                { card: "BT1-009", as: "fdFiller", faceUp: false },
              ],
            },
            { card: KUDAMON, as: "kudamon" },
          ],
          hand: [{ card: KENTAUROSMON, as: "kentaurosmon" }],
          trash: [
            { card: REPPAMON, as: "trashReppamon" },
            { card: CHIRINMON, as: "trashChirinmon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("fdReppamon").instanceId, s.inst("fdChirinmon").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(activate(s, "richard")).toEqual({ ok: true });
    await settle(() => s.perm("kudamon").topCard.cardId === KENTAUROSMON);
    await settle();

    const evolved = s.perm("kudamon");
    expect(evolved.topCard.instanceId).toBe(s.inst("kentaurosmon").instanceId);
    const stackIds = evolved.stack.map(({ instanceId }) => instanceId);
    expect(stackIds).toContain(s.inst("fdReppamon").instanceId);
    expect(stackIds).toContain(s.inst("fdChirinmon").instanceId);
    const trashIds = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(trashIds).toEqual(
      expect.arrayContaining([s.inst("trashReppamon").instanceId, s.inst("trashChirinmon").instanceId]),
    );
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("is offered with face-down cards split across two Tamers, a suspended Richard, and no Kentaurosmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: RICHARD,
              as: "richard",
              under: [
                { card: "BT1-009", as: "fd1", faceUp: false },
                { card: "BT1-010", as: "fd2", faceUp: false },
              ],
            },
            { card: RICHARD, as: "otherRichard", under: [{ card: "BT1-011", as: "fd3", faceUp: false }] },
            { card: KUDAMON, as: "kudamon" },
          ],
          trash: [
            { card: REPPAMON, as: "trashReppamon" },
            { card: CHIRINMON, as: "trashChirinmon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("richard").isSuspended = true;
    s.state.memory = 3;
    await s.ready();

    expect(mainEffectKeys(s, "richard")).toHaveLength(1);
  });

  describe("Richard Sampson Main material choices", () => {
    const RICHARD_ID = fixturePermanentId("own-richard");
    const KUDAMON_ID = fixturePermanentId("own-richard-kudamon");
    const FACE_DOWN_REPPAMON = fixtureInstanceId("own-source-richard-0-card");
    const FACE_DOWN_CHIRINMON = fixtureInstanceId("own-source-richard-1-card");
    const FACE_DOWN_FILLER = fixtureInstanceId("own-source-richard-2-card");

    async function openArena(id: Parameters<typeof layScenarioFixture>[1], preferInstanceIds: string[] = []) {
      const s = setupEngine(
        { 0: {}, 1: {} },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          declinePrompts: ["Place 1 card(s) under"],
          preferInstanceIds,
        },
      );
      layScenarioFixture(s.state, id, [RED_DECK, BLUE_DECK], true);
      const loop = s.engine.startTurnLoop();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => !s.state.pendingDecision);
      const richard = () => s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === RICHARD_ID)!;
      const kudamon = () => s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === KUDAMON_ID)!;
      return { s, loop, richard, kudamon };
    }

    it("offers no [Main] while both materials are only face down under Richard", async () => {
      const { s, loop, richard } = await openArena(fixtureRichardMainMaterialsFaceDown);
      expect(richard().stack).toHaveLength(3);
      expect(observe(s.engine).activatableEffects(richard())).toHaveLength(0);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });

    it("offers the [Main] and stacks the materials just trashed from under Richard", async () => {
      const preferInstanceIds = [FACE_DOWN_REPPAMON, FACE_DOWN_CHIRINMON];
      const { s, loop, richard, kudamon } = await openArena(fixtureRichardMainFreshMaterials, preferInstanceIds);
      expect(richard().stack).toHaveLength(3);
      const [effect] = observe(s.engine).activatableEffects(richard()) as { effectKey: string }[];
      expect(effect).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: richard().topCard.instanceId,
          effectKey: effect!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          kudamon().topCard.cardId === "BT3-043" &&
          !s.state.pendingDecision &&
          s.engine.mainVerbContinuationsInFlight === 0,
      );

      expect(kudamon().stack.map(({ instanceId }) => instanceId)).toEqual([
        FACE_DOWN_CHIRINMON,
        FACE_DOWN_REPPAMON,
        fixtureInstanceId("own-card-richard-kudamon-card"),
      ]);
      expect(richard().stack).toHaveLength(0);
      const trashIds = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
      expect(trashIds).toEqual(
        expect.arrayContaining([
          fixtureInstanceId("richard-trash-reppamon-card"),
          fixtureInstanceId("richard-trash-chirinmon-card"),
          FACE_DOWN_FILLER,
        ]),
      );
      expect(s.state.memory).toBe(1);

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });
  });
});
