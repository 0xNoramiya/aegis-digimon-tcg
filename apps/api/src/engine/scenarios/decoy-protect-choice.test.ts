import fixtureDecoyProtectChoice from "./decoy-protect-choice.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("Decoy protect choice arena scenario", () => {
  it("lets the human choose which Red/Black Digimon Decoy saves from Crimson Blaze", async () => {
    const preferInstanceIds = [
      fixtureInstanceId("own-card-decoy-token-card"),
      fixtureInstanceId("own-card-decoy-monodramon-card"),
    ];
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds });
    layScenarioFixture(s.state, fixtureDecoyProtectChoice, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    const attacker = human.battleArea.find(
      ({ topCard }) => topCard.instanceId === fixtureInstanceId("own-card-decoy-attacker-card"),
    )!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attacker, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "attackEnded" && event.attackerPermanentId === attacker) &&
        s.state.pendingDecision === undefined,
    );

    const protectPrompt = s.decisions.find(
      ({ seat, req }) => seat === 0 && req.promptText === "＜Decoy＞: choose 1 Digimon to protect from deletion",
    );
    const survivors = human.battleArea.map(({ topCard }) => topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    expect([...(protectPrompt?.req.options?.candidateInstanceIds ?? [])].sort()).toEqual(
      [
        fixtureInstanceId("own-card-decoy-agumon-card"),
        fixtureInstanceId("own-card-decoy-gotsumon-card"),
        fixtureInstanceId("own-card-decoy-monodramon-card"),
      ].sort(),
    );
    expect(survivors.sort()).toEqual([
      fixtureInstanceId("own-card-decoy-attacker-card"),
      fixtureInstanceId("own-card-decoy-monodramon-card"),
    ]);
  });
});
