import fixtureLordknightmonEx13Darkknightmon from "./lordknightmon-ex13-darkknightmon.fixture.js";
import fixtureLordknightmonBt22Skullknightmon from "./lordknightmon-bt22-skullknightmon.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture, type ScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const KNIGHTMON_ID = fixturePermanentId("own-lordknightmon-ex13-knightmon");
const HAND_LORDKNIGHTMON = fixtureInstanceId("lordknightmon-ex13-hand-lordknightmon-card");
const HAND_DARKKNIGHTMON = fixtureInstanceId("lordknightmon-ex13-hand-darkknightmon-card");
const TRASH_DARKKNIGHTMON = fixtureInstanceId("lordknightmon-ex13-trash-darkknightmon-card");
const BT22_LORDKNIGHTMON_ID = fixturePermanentId("own-lordknightmon-bt22-lordknightmon");
const REVEALED_SKULLKNIGHTMON = fixtureInstanceId("lordknightmon-bt22-deck-0-1-card");
const REVEALED_KNIGHTMON = fixtureInstanceId("lordknightmon-bt22-deck-0-2-card");
const REVEALED_YELLOW_KNIGHTMON = fixtureInstanceId("lordknightmon-bt22-deck-0-3-card");

type Setup = ReturnType<typeof setupEngine>;

async function openScenario(id: ScenarioFixture): Promise<Setup> {
  const s = setupEngine({ 0: {}, 1: {} });
  layScenarioFixture(s.state, id, [BLUE_DECK, RED_DECK], true);
  void s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return s;
}

function openDecision(s: Setup) {
  const pendingId = s.state.pendingDecision?.decisionId;
  const latest = s.decisions.at(-1)?.req;
  return latest && latest.decisionId === pendingId ? latest : undefined;
}

function respond(s: Setup, response: Record<string, unknown>): void {
  const decision = openDecision(s)!;
  expect(
    s.engine.applyIntent(0, { type: "respondDecision", decisionId: decision.decisionId, response } as never),
  ).toEqual({ ok: true });
}

async function nextDecision(s: Setup, previousId?: string) {
  await settle(() => openDecision(s) !== undefined && openDecision(s)!.decisionId !== previousId);
  return openDecision(s)!;
}

function battleAreaInstances(s: Setup): string[] {
  return s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId);
}

describe("LordKnightmon play targets", () => {
  for (const [source, instanceId] of [
    ["hand", HAND_DARKKNIGHTMON],
    ["trash", TRASH_DARKKNIGHTMON],
  ] as const) {
    it(`EX13 LordKnightmon plays EX10 DarkKnightmon from ${source}`, async () => {
      const s = await openScenario(fixtureLordknightmonEx13Darkknightmon);
      expect(
        s.engine.applyIntent(0, { type: "digivolve", permanentId: KNIGHTMON_ID, instanceId: HAND_LORDKNIGHTMON }),
      ).toEqual({ ok: true });

      const offer = await nextDecision(s);
      expect(offer.sourceCardId).toBe("EX13-064");
      expect([...(offer.options?.candidateInstanceIds ?? [])].sort()).toEqual(
        [HAND_DARKKNIGHTMON, TRASH_DARKKNIGHTMON].sort(),
      );
      respond(s, { kind: "selectCards", instanceIds: [instanceId] });
      await settle(() => battleAreaInstances(s).includes(instanceId));

      let previousId = offer.decisionId;
      while (s.state.pendingDecision !== undefined || openDecision(s) !== undefined) {
        const decision = await nextDecision(s, previousId);
        previousId = decision.decisionId;
        if (decision.kind === "optional") respond(s, { kind: "optional", accept: false });
        else respond(s, { kind: decision.kind, instanceIds: [decision.options!.candidateInstanceIds![0]!] });
        await settle(() => s.state.pendingDecision?.decisionId !== decision.decisionId);
      }

      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual(
        ["EX10-031", "EX13-064"].sort(),
      );
      const otherCopy = source === "hand" ? TRASH_DARKKNIGHTMON : HAND_DARKKNIGHTMON;
      const zoneOfOther = source === "hand" ? s.state.players[0]!.trash : s.state.players[0]!.hand;
      expect(zoneOfOther.map((card) => card.instanceId)).toContain(otherCopy);
    });
  }

  it("BT22 LordKnightmon plays a revealed Black/Purple SkullKnightmon", async () => {
    const s = await openScenario(fixtureLordknightmonBt22Skullknightmon);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: BT22_LORDKNIGHTMON_ID,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    const reveal = await nextDecision(s);
    expect(reveal.sourceCardId).toBe("BT22-067");
    expect(reveal.options?.candidateInstanceIds).toEqual([REVEALED_SKULLKNIGHTMON]);
    respond(s, { kind: "selectCards", instanceIds: [REVEALED_SKULLKNIGHTMON] });

    let previousId = reveal.decisionId;
    await settle(() => battleAreaInstances(s).includes(REVEALED_SKULLKNIGHTMON));
    while (observe(s.engine).isAttacking() || s.state.pendingDecision !== undefined) {
      await settle(() => openDecision(s)?.decisionId !== previousId || !observe(s.engine).isAttacking());
      const decision = openDecision(s);
      if (decision === undefined || decision.decisionId === previousId) continue;
      previousId = decision.decisionId;
      if (decision.kind === "optional") respond(s, { kind: "optional", accept: false });
      else if (decision.kind === "selectCards" && (decision.options?.min ?? 0) === 0)
        respond(s, { kind: "selectCards", instanceIds: [] });
      else respond(s, { kind: decision.kind, instanceIds: [decision.options!.candidateInstanceIds![0]!] });
    }

    expect(battleAreaInstances(s)).toContain(REVEALED_SKULLKNIGHTMON);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [REVEALED_KNIGHTMON, REVEALED_YELLOW_KNIGHTMON].sort(),
    );
  });
});
