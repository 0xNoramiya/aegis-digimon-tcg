import fixtureRainbowEvoCost from "./rainbow-evo-cost.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("Rainbow Lv.6 digivolve cost arena scenario", () => {
  it("digivolves Merciful Mode onto red/black WarGreymon and Susanoomon onto purple Boltmon ()", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoDeclineOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    layScenarioFixture(s.state, fixtureRainbowEvoCost, [BLUE_DECK, RED_DECK], true);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(12);

    const human = s.state.players[0]!;
    const topped = (cardId: string) => human.battleArea.some(({ topCard }) => topCard.cardId === cardId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fixturePermanentId("own-rainbow-wargreymon"),
        instanceId: fixtureInstanceId("rainbow-merciful-mode-card"),
      }),
    ).toEqual({ ok: true });
    await settle(() => topped("EX13-077") && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(6);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fixturePermanentId("own-rainbow-boltmon"),
        instanceId: fixtureInstanceId("rainbow-susanoomon-card"),
      }),
    ).toEqual({ ok: true });
    await settle(() => topped("EX12-076") && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
  });
});
