import fixtureEx12MetalgarurumonTrashThenReturn from "./ex12-metalgarurumon-trash-then-return.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const CHERUBIMON = fixturePermanentId("opponent-metalgarurumon-cherubimon");
const SALAMON = fixturePermanentId("opponent-metalgarurumon-salamon");
const CHERUBIMON_SOURCE = fixtureInstanceId("opponent-source-metalgarurumon-cherubimon-0-card");

describe("EX12 MetalGarurumon arena scenario", () => {
  it("trashes the sources first, then asks for the return target separately", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(s.state, fixtureEx12MetalgarurumonTrashThenReturn, [BLUE_DECK, RED_DECK], true);
    const bot = s.state.players[1]!;

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fixturePermanentId("own-metalgarurumon-base"),
        instanceId: fixtureInstanceId("metalgarurumon-in-hand-card"),
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);

    const { req } = s.decisions.at(-1)!;
    expect(req.kind).toBe("chooseTargets");
    expect(req.options).toMatchObject({
      candidateInstanceIds: [CHERUBIMON, SALAMON],
      min: 1,
      max: 1,
      targetFate: "returnToDeck",
    });
    expect(bot.trash.map(({ instanceId }) => instanceId)).toContain(CHERUBIMON_SOURCE);
    expect(bot.battleArea.find(({ permanentId }) => permanentId === CHERUBIMON)?.stack).toHaveLength(0);
    // The trash had no choice to ask for, so this event is the only way the player learns it happened.
    expect(
      s.events.find((event) => event.kind === "cardsMoved" && event.instanceIds.includes(CHERUBIMON_SOURCE)),
    ).toMatchObject({
      to: "trash",
      seat: 1,
      cardIds: ["BT16-024"],
      trashedSources: { permanentId: CHERUBIMON, hostCardId: "EX6-035", sourceCardId: "EX12-035" },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: { kind: "chooseTargets", instanceIds: [SALAMON] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => bot.battleArea.every(({ permanentId }) => permanentId !== SALAMON) && s.state.pendingDecision === undefined,
    );

    expect(bot.battleArea.map(({ permanentId }) => permanentId)).toEqual([CHERUBIMON]);
    expect(bot.deck.at(-1)?.cardId).toBe("BT15-034");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
