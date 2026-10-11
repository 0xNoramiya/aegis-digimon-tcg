import fixtureBt17DexdoruExactName from "./bt17-dexdoru-exact-name.fixture.js";
import { fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const PREVENT_PROMPT = "Prevent leaving the battle area?";

describe("BT17 DexDoruGreymon exact-name arena scenario", () => {
  it("offers the [Trash] effect for DoruGreymon but not for a DexDoruGreymon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true, preferInstanceIds },
    );
    layScenarioFixture(s.state, fixtureBt17DexdoruExactName, [BLUE_DECK, RED_DECK], true);
    const human = s.state.players[0]!;
    const preventPrompts = () =>
      s.decisions.filter(({ req }) => req.kind === "optional" && req.promptText === PREVENT_PROMPT).length;
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;

    preferInstanceIds.splice(0, preferInstanceIds.length, fixtureInstanceId("own-card-dexdoru-near-name-card"));
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("dexdoru-disaster-1-card") }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.trash.some(({ instanceId }) => instanceId === fixtureInstanceId("own-card-dexdoru-near-name-card")) &&
        s.state.pendingDecision === undefined,
    );
    const promptsForNearName = preventPrompts();
    const trashCopyStayed = human.trash.some(
      ({ instanceId }) => instanceId === fixtureInstanceId("dexdoru-trash-card"),
    );

    preferInstanceIds.splice(0, preferInstanceIds.length, fixtureInstanceId("own-card-dexdoru-doru-greymon-card"));
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("dexdoru-disaster-2-card") }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea.some(
          ({ permanentId, topCard }) =>
            permanentId === fixturePermanentId("own-dexdoru-doru-greymon") && topCard.cardId === "BT17-067",
        ) && s.state.pendingDecision === undefined,
    );

    const protectedDigimon = human.battleArea.find(
      ({ permanentId }) => permanentId === fixturePermanentId("own-dexdoru-doru-greymon"),
    );
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    expect(promptsForNearName).toBe(0);
    expect(trashCopyStayed).toBe(true);
    expect(preventPrompts()).toBeGreaterThanOrEqual(1);
    expect(protectedDigimon?.stack.some(({ cardId }) => cardId === "BT16-061")).toBe(true);
  });
});
