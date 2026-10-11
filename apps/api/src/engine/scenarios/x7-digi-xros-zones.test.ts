import fixtureX7DigixrosZones from "./x7-digixros-zones.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase, type DecisionRequest } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const SHOUTMON_X7_PERMANENT = fixturePermanentId("own-x7");
const SHOUTMON_X7 = fixtureInstanceId("own-card-x7-card");
const SHOUTMON_X4 = fixtureInstanceId("own-source-x7-0-card");
const STARMONS = fixtureInstanceId("own-source-x7-1-card");
const BALLISTAMON = fixtureInstanceId("own-source-x7-2-card");
const TAIKI_PERMANENT = fixturePermanentId("own-x7-taiki");
const TAIKI = fixtureInstanceId("own-card-x7-taiki-card");
const OLDER_DORULUMON = fixtureInstanceId("own-source-x7-taiki-0-card");
const HAND_DORULUMON = fixtureInstanceId("x7-hand-dorulumon-card");
const OMNIMON_PERMANENT = fixturePermanentId("opponent-x7-omnimon");

// Discord 1558458433970380820. DigiXros materials come from the hand and battle area (rule 7-2-1),
// and X7 itself may be one (Q6061). Cards under Tamers need a permission such as Taiki Kudo's
// [Your Turn] effect, paid by suspending Taiki (Q2011/Q2012). With it, the cards X7 just placed
// under Taiki are eligible too (Q6060).
it.each([
  {
    useTaiki: true,
    offered: [SHOUTMON_X7, HAND_DORULUMON, OLDER_DORULUMON, STARMONS, BALLISTAMON],
    materials: [SHOUTMON_X7, BALLISTAMON, OLDER_DORULUMON, STARMONS],
  },
  { useTaiki: false, offered: [SHOUTMON_X7, HAND_DORULUMON], materials: [SHOUTMON_X7, HAND_DORULUMON] },
])(
  "arena: under-Tamer DigiXros materials need Taiki (use Taiki: $useTaiki)",
  async ({ useTaiki, offered, materials }) => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(s.state, fixtureX7DigixrosZones, [RED_DECK, BLUE_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: SHOUTMON_X7_PERMANENT,
        target: { kind: "permanent", permanentId: OMNIMON_PERMANENT },
      }),
    ).toEqual({ ok: true });

    const isDigiXrosPrompt = (request: DecisionRequest | undefined) =>
      request?.kind === "selectCards" && request.options?.digiXrosCardId === "BT10-009";
    let digiXrosRequest: DecisionRequest | undefined;
    let taikiOffered = false;
    for (let step = 0; step < 20 && digiXrosRequest === undefined; step += 1) {
      await settle(() => s.state.pendingDecision !== undefined);
      const request = s.decisions.at(-1)!.req;
      if (isDigiXrosPrompt(request)) {
        digiXrosRequest = request;
        break;
      }
      const candidates = request.options?.candidateInstanceIds ?? [];
      const offersTaiki = request.kind === "selectCards" && candidates.includes(TAIKI);
      if (offersTaiki) taikiOffered = true;
      const response =
        request.kind === "optional"
          ? { kind: "optional" as const, accept: true }
          : request.kind === "orderCards"
            ? { kind: "orderCards" as const, order: candidates }
            : request.kind === "selectCards" && candidates.includes(STARMONS)
              ? { kind: "selectCards" as const, instanceIds: [STARMONS, BALLISTAMON] }
              : offersTaiki
                ? { kind: "selectCards" as const, instanceIds: useTaiki ? [TAIKI] : [] }
                : request.kind === "chooseTargets"
                  ? { kind: "chooseTargets" as const, instanceIds: candidates.slice(0, 1) }
                  : { kind: "selectCards" as const, instanceIds: candidates.slice(0, 1) };
      expect(
        s.engine.applyIntent(request.seat, { type: "respondDecision", decisionId: request.decisionId, response }),
      ).toEqual({ ok: true });
    }

    expect(taikiOffered).toBe(true);
    expect(digiXrosRequest).toBeDefined();
    expect([...(digiXrosRequest!.options?.candidateInstanceIds ?? [])].sort()).toEqual([...offered].sort());
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: digiXrosRequest!.decisionId,
        response: { kind: "selectCards", instanceIds: materials },
      }),
    ).toEqual({ ok: true });

    const shoutmonX4 = () =>
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === SHOUTMON_X4);
    await settle(() => shoutmonX4()?.stack.length === materials.length && s.engine.mainVerbContinuationsInFlight === 0);

    expect(
      shoutmonX4()!
        .stack.map((card) => card.instanceId)
        .sort(),
    ).toEqual([...materials].sort());
    const taiki = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === TAIKI_PERMANENT)!;
    expect(taiki.isSuspended).toBe(useTaiki);
    expect(taiki.stack.map((card) => card.instanceId).sort()).toEqual(
      (useTaiki ? [] : [OLDER_DORULUMON, STARMONS, BALLISTAMON]).sort(),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === SHOUTMON_X7_PERMANENT)).toBe(
      false,
    );

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  },
);
