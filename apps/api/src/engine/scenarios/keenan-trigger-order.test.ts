import fixtureKeenanTriggerOrder from "./keenan-trigger-order.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const SCENARIO = fixtureKeenanTriggerOrder;
const GUARDROMON_ID = fixturePermanentId("own-keenan-guardromon");
const KEENAN_ID = fixturePermanentId("own-keenan-tamer");

/**
 * Play the reported line: digivolve into GreatGrizzlymon on your turn so the bot's Peckmon must
 * attack at the start of its Main Phase, then Blast Digivolve into Leopardmon in that Counter
 * Timing and play Gotsumon. Returns the order prompt and the events after the chosen answer.
 */
async function playGotsumonInForcedAttack(first: "EX13-047" | "BT13-102") {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false, declineDigiXros: true },
  );
  layScenarioFixture(s.state, SCENARIO, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: GUARDROMON_ID,
      instanceId: fixtureInstanceId("keenan-greatgrizzlymon-card"),
    }),
  ).toEqual({ ok: true });
  await settleAcrossTimers(() => s.state.pendingDecision === undefined && s.state.phase === Phase.Main);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await settleAcrossTimers(() => s.events.some((event) => event.kind === "counterWindowOpened"));

  expect(
    s.engine.applyIntent(0, {
      type: "respondCounter",
      sourceInstanceId: fixtureInstanceId("keenan-leopardmon-card"),
      effectKey: `blast-digivolve:${GUARDROMON_ID}`,
    }),
  ).toEqual({ ok: true });
  await settleAcrossTimers(
    () =>
      s.state.pendingDecision?.kind === "orderTriggers" || s.events.some((event) => event.kind === "counterResolved"),
  );
  const prompt = s.decisions.find(({ req }) => req.kind === "orderTriggers")?.req;
  const firstIndex = prompt?.options?.triggerCardIds?.indexOf(first) ?? -1;
  const firstKey = prompt?.options?.triggerKeys?.[firstIndex];
  // Without an order prompt the old split pool runs on, and the resolved order assertion fails.
  if (prompt !== undefined && firstKey !== undefined) {
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: prompt.decisionId,
      response: { kind: "orderTriggers", order: [firstKey] },
    });
  }
  await settleAcrossTimers(() => s.events.some((event) => event.kind === "blockWindowOpened"));

  const resolvedOrder = s.events.flatMap((event) =>
    event.kind === "effectResolved" && ["EX13-047", "BT13-102"].includes(event.sourceCardId)
      ? [event.sourceCardId]
      : event.kind === "counterResolved"
        ? ["counterResolved"]
        : [],
  );
  const keenanSuspended = s.state.players[0]!.battleArea.find(
    ({ permanentId }) => permanentId === KEENAN_ID,
  )!.isSuspended;
  expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
  await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
  s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
  await loop;
  return { prompt, resolvedOrder, keenanSuspended };
}

// Discord 1558478403219488899 (match b4b8e39b): inside an effect-ordered attack, Blast Digivolve's
// [When Digivolving] played Gotsumon. Keenan's watcher resolved at once with no order prompt and
// Gotsumon's [On Play] waited until after Counter Timing. Both trigger on the same play and share
// a controller, so that player orders them before the attack continues (CR 15-4).
describe("Keenan and an effect-played Digimon's [On Play]", () => {
  it("offers both effects in one order prompt and resolves Gotsumon first when chosen", async () => {
    const { prompt, resolvedOrder, keenanSuspended } = await playGotsumonInForcedAttack("EX13-047");

    expect(prompt?.seat).toBe(0);
    expect([...(prompt?.options?.triggerCardIds ?? [])].sort()).toEqual(["BT13-102", "EX13-047"]);
    expect(resolvedOrder).toEqual(["EX13-047", "BT13-102", "counterResolved"]);
    expect(keenanSuspended).toBe(true);
  });

  it("resolves Keenan first when the player picks it, still before Counter Timing ends", async () => {
    const { resolvedOrder } = await playGotsumonInForcedAttack("BT13-102");

    expect(resolvedOrder).toEqual(["BT13-102", "EX13-047", "counterResolved"]);
  });
});
