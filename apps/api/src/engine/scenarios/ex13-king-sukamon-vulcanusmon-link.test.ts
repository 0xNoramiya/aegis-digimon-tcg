import fixtureEx13KingsukamonVulcanusmonLink from "./ex13-kingsukamon-vulcanusmon-link.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const TARGET = fixturePermanentId("kingsukamon-vulcanusmon-target");
const DIVINE_ARMS = fixtureInstanceId("kingsukamon-vulcanusmon-divine-arms-card");
const IRON_SLASH = fixtureInstanceId("kingsukamon-vulcanusmon-iron-slash-card");

describe("EX13 KingSukamon vs linked Vulcanusmon arena scenario", () => {
  it("trashes Divine Arms once Vulcanusmon is renamed to [Sukamon]", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureEx13KingsukamonVulcanusmonLink, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const target = () => s.state.players[1]!.battleArea.find(({ permanentId }) => permanentId === TARGET)!;
    expect(target().linked.map(({ instanceId }) => instanceId)).toEqual([DIVINE_ARMS, IRON_SLASH]);
    expect(observe(s.engine).hasKeyword(target(), "Reboot")).toBe(true);

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("kingsukamon-vulcanusmon-king-card") }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === DIVINE_ARMS),
    );

    expect(observe(s.engine).effectiveNames(target())).toEqual(["sukamon"]);
    expect(target().linked.map(({ instanceId }) => instanceId)).toEqual([IRON_SLASH]);
    expect(observe(s.engine).hasKeyword(target(), "Reboot")).toBe(false);
    expect(observe(s.engine).hasPierce(target())).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
