import fixtureShoutmonRushControl from "./shoutmon-rush-control.fixture.js";
import fixtureShoutmonRush from "./shoutmon-rush.fixture.js";
import fixtureShoutmonMaterialSavePrinted from "./shoutmon-material-save-printed.fixture.js";
import fixtureShoutmonMaterialSaveEvolved from "./shoutmon-material-save-evolved.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("Shoutmon printed-rules arena controls", () => {
  it.each([false, true])("actual turn loop enforces the Xros Heart Rush condition (control=%s)", async (control) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(
      s.state,
      control ? fixtureShoutmonRushControl : fixtureShoutmonRush,
      [RED_DECK, BLUE_DECK],
      true,
    );
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: fixtureInstanceId("shoutmon-host-card"),
          digiXros: {
            materialInstanceIds: [fixtureInstanceId("shoutmon-omni-card"), fixtureInstanceId("shoutmon-other-card")],
          },
        }),
      ).toEqual({ ok: true });
      const cardId = control ? "BT21-027" : "BT15-012";
      await settle(
        () =>
          s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === cardId) &&
          s.state.pendingDecision === undefined,
      );
      const host = s.state.players[0]!.battleArea.find(
        (p) => p.topCard.instanceId === fixtureInstanceId("shoutmon-host-card"),
      )!;
      expect(host.stack.map((c) => c.instanceId)).toEqual([
        fixtureInstanceId("shoutmon-other-card"),
        fixtureInstanceId("shoutmon-omni-card"),
      ]);
      expect(observe(s.engine).hasKeyword(host, "Rush")).toBe(control);
      expect(s.state.memory).toBe(control ? 4 : 7);
      const securityBefore = s.state.players[1]!.security.length;
      const result = s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: host.permanentId,
        target: { kind: "player" },
      });
      expect(result).toMatchObject({ ok: control });
      if (control) {
        await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      }
      expect(s.events.some((e) => e.kind === "securityChecked")).toBe(control);
      expect(s.events.some((e) => e.kind === "attackDeclared")).toBe(control);
      expect(s.state.players[1]!.security).toHaveLength(control ? securityBefore - 2 : securityBefore);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it.each([false, true])(
    "actual start-turn deletion saves printed names but excludes DigiXros-only aliases (printed=%s)",
    async (printed) => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
      layScenarioFixture(
        s.state,
        printed ? fixtureShoutmonMaterialSavePrinted : fixtureShoutmonMaterialSaveEvolved,
        [RED_DECK, BLUE_DECK],
        true,
      );
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.memory).toBe(4);
        expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT15-012")).toBe(false);
        const tamer = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT10-087")!;
        expect(tamer.stack.map((c) => c.cardId).sort()).toEqual(printed ? ["BT10-008", "BT10-049"] : []);
        expect(s.state.players[0]!.trash.map((c) => c.cardId).sort()).toEqual(
          printed ? ["BT15-012"] : ["BT15-012", "BT19-051", "BT21-021"],
        );
        expect(s.decisions.some(({ req }) => req.promptText?.includes("Material Save"))).toBe(printed);
        expect(
          s.events.filter(
            (e) => e.kind === "effectTriggered" && (e.sourceCardId === "BT21-021" || e.sourceCardId === "BT19-051"),
          ),
        ).toHaveLength(0);
        expect(s.state.pendingDecision).toBeUndefined();
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );
});
