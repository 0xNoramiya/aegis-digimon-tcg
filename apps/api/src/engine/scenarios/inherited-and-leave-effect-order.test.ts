import fixtureBt13KurataBelphemonPlayCost from "./bt13-kurata-belphemon-play-cost.fixture.js";
import fixtureEx10CloseSunarizamonWithoutClose from "./ex10-close-sunarizamon-without-close.fixture.js";
import fixtureEx11PyramidimonFragmentRecovery from "./ex11-pyramidimon-fragment-recovery.fixture.js";
import { fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

async function startHumanMain(s: ReturnType<typeof setupEngine>): Promise<{ loop: Promise<void> }> {
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { loop };
}

describe("card-fix arena scenarios", () => {
  it("Kurata's Gizmon: AT deletion reduces Belphemon: Sleep Mode by 6", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureBt13KurataBelphemonPlayCost, [BLUE_DECK, RED_DECK], true);
    const human = s.state.players[0]!;
    const { loop } = await startHumanMain(s);

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("kurata-belphemon-card") }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea.some(({ topCard }) => topCard.instanceId === fixtureInstanceId("kurata-belphemon-card")) &&
        s.state.pendingDecision === undefined,
      5000,
    );

    expect(human.battleArea.some(({ permanentId }) => permanentId === fixturePermanentId("own-kurata-gizmon"))).toBe(
      false,
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.turnSeat).toBe(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Close returns itself and plays Sunarizamon with no Close in hand", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureEx10CloseSunarizamonWithoutClose, [BLUE_DECK, RED_DECK], true);
    const human = s.state.players[0]!;
    const { loop } = await startHumanMain(s);
    await settle(() => s.state.pendingDecision === undefined, 5000);

    expect(human.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      fixtureInstanceId("close-sunarizamon-card"),
    ]);
    expect(human.deck.at(-1)?.instanceId).toBe(fixtureInstanceId("own-card-close-tamer-card"));
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Pyramidimon's Fragment trash triggers its [All Turns] recovery", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["By trashing any 3"] },
    );
    layScenarioFixture(s.state, fixtureEx11PyramidimonFragmentRecovery, [BLUE_DECK, RED_DECK], true);
    const pyramidimon = () =>
      s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === fixturePermanentId("own-pyramidimon"));
    const { loop } = await startHumanMain(s);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fixturePermanentId("own-pyramidimon"),
        target: { kind: "permanent", permanentId: fixturePermanentId("opponent-pyramidimon-brachiomon") },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);

    expect(s.events.some((event) => event.kind === "deletionPrevented" && event.keyword === "Fragment")).toBe(true);
    expect(pyramidimon()?.stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        fixtureInstanceId("pyramidimon-trash-a-card"),
        fixtureInstanceId("pyramidimon-trash-b-card"),
        fixtureInstanceId("pyramidimon-trash-c-card"),
      ]),
    );
    expect(pyramidimon()?.stack).toHaveLength(4);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
