import { Phase, type DecisionRequest } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const SHOUTMON_X7_PERMANENT = "dev-perm-0-discord-x7";
const SHOUTMON_X7 = "dev-field-0-discord-x7";
const SHOUTMON_X4 = "dev-stack-0-discord-x7-0";
const STARMONS = "dev-stack-0-discord-x7-1";
const BALLISTAMON = "dev-stack-0-discord-x7-2";
const TAI_PERMANENT = "dev-perm-0-discord-x7-tai";
const OLDER_DORULUMON = "dev-stack-0-discord-x7-tai-0";
const HAND_DORULUMON = "dev-discord-x7-hand-dorulumon";
const OMNIMON_PERMANENT = "dev-perm-1-discord-x7-omnimon";

// Discord 1558458433970380820. DigiXros materials come from the hand and battle area (rule 7-2-1).
// Q6060 adds only the cards that AD1-006's own [All Turns] effect placed under a Tamer.
it("Discord 1558458433970380820 arena: X7 replacement play offers only legal DigiXros zones", async () => {
  const s = setupEngine({ 0: {}, 1: {} });
  layDevScenario("arena-discord-x7-digixros-zones", s.state, [RED_DECK, BLUE_DECK]);
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
  for (let step = 0; step < 20 && digiXrosRequest === undefined; step += 1) {
    await settle(() => s.state.pendingDecision !== undefined);
    const request = s.decisions.at(-1)!.req;
    if (isDigiXrosPrompt(request)) {
      digiXrosRequest = request;
      break;
    }
    const candidates = request.options?.candidateInstanceIds ?? [];
    const response =
      request.kind === "optional"
        ? { kind: "optional" as const, accept: true }
        : request.kind === "orderCards"
          ? { kind: "orderCards" as const, order: candidates }
          : request.kind === "selectCards" && candidates.includes(STARMONS)
            ? { kind: "selectCards" as const, instanceIds: [STARMONS, BALLISTAMON] }
            : request.kind === "chooseTargets"
              ? { kind: "chooseTargets" as const, instanceIds: candidates.slice(0, 1) }
              : { kind: "selectCards" as const, instanceIds: candidates.slice(0, 1) };
    expect(
      s.engine.applyIntent(request.seat, { type: "respondDecision", decisionId: request.decisionId, response }),
    ).toEqual({ ok: true });
  }

  expect(digiXrosRequest).toBeDefined();
  expect([...(digiXrosRequest!.options?.candidateInstanceIds ?? [])].sort()).toEqual(
    [SHOUTMON_X7, HAND_DORULUMON, STARMONS, BALLISTAMON].sort(),
  );
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: digiXrosRequest!.decisionId,
      response: { kind: "selectCards", instanceIds: [SHOUTMON_X7, BALLISTAMON, HAND_DORULUMON, STARMONS] },
    }),
  ).toEqual({ ok: true });

  const shoutmonX4 = () =>
    s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === SHOUTMON_X4);
  await settle(() => shoutmonX4()?.stack.length === 4 && s.engine.mainVerbContinuationsInFlight === 0);

  expect(
    shoutmonX4()!
      .stack.map((card) => card.instanceId)
      .sort(),
  ).toEqual([SHOUTMON_X7, HAND_DORULUMON, STARMONS, BALLISTAMON].sort());
  const tai = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === TAI_PERMANENT)!;
  expect(tai.stack.map((card) => card.instanceId)).toEqual([OLDER_DORULUMON]);
  expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === SHOUTMON_X7_PERMANENT)).toBe(
    false,
  );

  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
