import fixtureX7DigixrosZones from "./x7-digixros-zones.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const SHOUTMON_X7_PERMANENT = fixturePermanentId("own-x7");
const OMNIMON_PERMANENT = fixturePermanentId("opponent-x7-omnimon");

// Rules 11-1-3 and 11-1-4: [When Attacking] effects resolve before the battle. The client
// presents the battle after Starmons' (BT10-029) inherited draw because the server sends it after.
it("Starmons' [When Attacking] draw resolves before the battle", async () => {
  const s = setupEngine({ 0: {}, 1: {} });
  layScenarioFixture(s.state, fixtureX7DigixrosZones, [RED_DECK, BLUE_DECK], true);
  s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const handBefore = s.state.players[0]!.hand.length;
  const start = s.events.length;

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: SHOUTMON_X7_PERMANENT,
      target: { kind: "permanent", permanentId: OMNIMON_PERMANENT },
    }),
  ).toEqual({ ok: true });
  for (let step = 0; step < 5 && !s.events.slice(start).some((event) => event.kind === "attackEnded"); step += 1) {
    await settle(() => s.state.pendingDecision !== undefined);
    const request = s.decisions.at(-1)!.req;
    expect(request.kind).toBe("optional");
    expect(
      s.engine.applyIntent(request.seat, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
  }

  const kinds = s.events
    .slice(start)
    .map((event) =>
      event.kind === "effectResolved" || event.kind === "effectTriggered"
        ? `${event.kind}:${event.sourceCardId}`
        : event.kind,
    );
  const starmonsResolved = kinds.indexOf("effectResolved:BT10-029");
  expect(kinds.indexOf("effectTriggered:BT10-029")).toBeGreaterThan(kinds.indexOf("attackDeclared"));
  expect(starmonsResolved).toBeGreaterThan(kinds.indexOf("effectTriggered:BT10-029"));
  expect(kinds.indexOf("battleCompared")).toBeGreaterThan(starmonsResolved);
  expect(kinds.indexOf("combatResolved")).toBeGreaterThan(kinds.indexOf("battleCompared"));
  expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
  expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === SHOUTMON_X7_PERMANENT)).toBe(false);
});
