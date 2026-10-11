import fixtureSukamonInheritedProtection from "./sukamon-inherited-protection.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const KINGSUKAMON_ID = fixturePermanentId("own-kingsukamon");
const SUKAMON_ID = fixturePermanentId("own-sukamon");

async function openScenario() {
  const s = setupEngine({ 0: {}, 1: {} }, { autoOrderTriggers: false });
  layScenarioFixture(s.state, fixtureSukamonInheritedProtection, [RED_DECK, BLUE_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

function openDecision(s: ReturnType<typeof setupEngine>) {
  const pendingId = s.state.pendingDecision?.decisionId;
  const latest = s.decisions.at(-1)?.req;
  return latest && latest.decisionId === pendingId ? latest : undefined;
}

function respond(s: ReturnType<typeof setupEngine>, response: Record<string, unknown>) {
  const decisionId = s.state.pendingDecision!.decisionId;
  expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId, response } as never)).toEqual({ ok: true });
  return decisionId;
}

async function nextDecision(s: ReturnType<typeof setupEngine>, after: string | undefined) {
  await settle(() => {
    const decision = openDecision(s);
    return decision !== undefined && decision.decisionId !== after;
  });
  return openDecision(s)!;
}

// Feedback report #18: "New Sukamon Protection Inheritables are not activating". The report has no
// match id. The printed clause is "When this Digimon would leave the battle area other than by your
// effects, by deleting 1 other Digimon with [Sukamon] in its name, it doesn't leave" (EX13-027,
// EX13-028). A battle loss is not one of your effects, so paying the cost must keep the Digimon.
describe("EX13 Sukamon inherited leave protection", () => {
  it("keeps KingSukamon in play after it loses a security battle and the cost deletes Sukamon", async () => {
    const { s, loop } = await openScenario();
    const kingSukamonStack = s.state.players[0]!.battleArea.find((p) => p.permanentId === KINGSUKAMON_ID)!.stack.map(
      (card) => card.instanceId,
    );

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: KINGSUKAMON_ID, target: { kind: "player" } }),
    ).toEqual({ ok: true });

    const order = await nextDecision(s, undefined);
    expect(order.kind).toBe("orderTriggers");
    expect(order.options?.triggerCardIds).toEqual(["EX13-027", "EX13-028"]);
    const orderId = respond(s, { kind: "orderTriggers", order: order.options!.triggerKeys });

    const prevent = await nextDecision(s, orderId);
    expect(prevent).toMatchObject({ kind: "optional", sourceCardId: "EX13-027" });
    expect(prevent.options?.affectedPermanentIds).toEqual([KINGSUKAMON_ID]);
    respond(s, { kind: "optional", accept: true });

    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.security.length === 2);
    const human = s.state.players[0]!;
    const kingSukamon = human.battleArea.find((p) => p.permanentId === KINGSUKAMON_ID);
    expect(kingSukamon?.topCard.cardId).toBe("EX13-031");
    expect(kingSukamon?.stack.map((card) => card.instanceId)).toEqual(kingSukamonStack);
    expect(human.battleArea.some((p) => p.permanentId === SUKAMON_ID)).toBe(false);
    expect(human.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX13-027", "EX13-028"]));
    // EX13-028 offers its own copy after EX13-027 saved KingSukamon (Q4261), but no other
    // [Sukamon] Digimon is left to pay with, so it is never asked.
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX13-028" && req.kind === "optional")).toEqual([]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
