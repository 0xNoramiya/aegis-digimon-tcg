import { expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

it.each([true, false])(
  "Feedback #51: GX's copied token/protection decisions preserve donor text, token=%s",
  async (accept) => {
    const s = setupEngine({
      autoSelectCards: true,
      preferInstanceIds: ["dev-perm-0-feedback51-white"],
      autoAcceptOptional: true,
      declinePrompts: accept ? [] : ["Hinukamuy"],
    });
    layDevScenario("arena-feedback51-jesmon-gx-copied-text", s.state, [RED_DECK, BLUE_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const host = human.battleArea[0]!;
      const initialSource = host.topCard.instanceId;
      const beforeDeck = human.deck.length;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: host.permanentId,
          instanceId: "feedback51-gx",
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !s.state.pendingDecision &&
          s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT10-112"),
      );
      const copied = s.decisions.filter(({ req }) => req.options?.effectText?.includes("Hinukamuy"));
      expect(copied).toHaveLength(2);
      const ownPlacement = s.decisions.find(({ req }) => req.promptText === "Place 1 card(s) under")!.req;
      expect(ownPlacement.sourceCardId).toBe("BT10-112");
      expect(ownPlacement.options?.effectTextCardId).toBeUndefined();
      expect(ownPlacement.options?.effectText).toContain("Activate 1 of that Digimon");
      for (const { req } of copied) {
        expect(req.sourceCardId).toBe("BT10-112");
        expect(req.sourceInstanceId).toBe("feedback51-gx");
        expect(req.sourcePermanentId).toBe(host.permanentId);
        expect(req.options?.effectTextCardId).toBe("EX13-061");
      }
      expect(copied.map(({ req }) => req.kind)).toEqual(["optional", "chooseTargets"]);
      expect(copied[0]!.req.options?.effectTextPart).toContain("You may play 1 [Hinukamuy] Token");
      expect(copied[1]!.req.options?.effectTextPart).toContain(
        "their Digimon effects don't affect 1 of your white Digimon",
      );
      expect(host.stack.map((c) => c.instanceId)).toEqual(["feedback51-donor", initialSource]);
      expect(host.topCard.instanceId).toBe("feedback51-gx");
      expect(human.battleArea.filter((p) => p.topCard.cardId === "TOKEN-Hinukamuy-Token")).toHaveLength(Number(accept));
      expect(observe(s.engine).isRestrictedByEffect(human.battleArea[1]!, "beAffected", "Digimon")).toBe(true);
      expect(observe(s.engine).hasRestriction(host, "beAffected")).toBe(false);
      expect(s.state.memory).toBe(5);
      expect(human.deck).toHaveLength(beforeDeck - 1);
      const donorResolved = s.events.findIndex((e) => e.kind === "effectResolved" && e.sourceCardId === "EX13-061");
      const gxResolved = s.events.findIndex((e) => e.kind === "effectResolved" && e.sourceCardId === "BT10-112");
      expect(donorResolved).toBeGreaterThan(-1);
      expect(gxResolved).toBeGreaterThan(donorResolved);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.state.memory).toBe(3);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);

it("Feedback #51: returning from the donor restores GX's own Blitz display provenance", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT6-111", as: "base" }, { card: "BT6-082", as: "white" }, { card: "BT6-084" }],
        hand: [
          { card: "BT10-112", as: "gx" },
          { card: "EX13-061", as: "donor" },
        ],
        deck: ["BT1-009"],
      },
      1: { security: ["BT1-009"] },
    },
    { autoSelectCards: true, autoAcceptOptional: true, declinePrompts: ["Blitz"] },
  );
  s.state.memory = 4;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("gx").instanceId,
      useAlternateCost: true,
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      !s.state.pendingDecision && s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT10-112"),
  );
  const blitz = s.decisions.find(({ req }) => req.promptText?.includes("Blitz"))!.req;
  expect(blitz.sourceCardId).toBe("BT10-112");
  expect(blitz.options?.effectTextCardId).toBeUndefined();
  expect(blitz.options?.effectText).toContain("Then, ＜Blitz＞");
  expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(0);
  expect(s.state.memory).toBe(-1);
  assertNoLoudGap(s);
});
