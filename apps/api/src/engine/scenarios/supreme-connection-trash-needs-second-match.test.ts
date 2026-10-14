import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { settle, type EngineSetup } from "../testkit/harness.js";
import { setupScenario } from "../testkit/scenario.js";
import { supremeConnectionTrashNeedsSecondMatch } from "./supreme-connection-trash-needs-second-match.fixture.js";

async function withScenario(secondMatch: boolean, verify: (s: EngineSetup) => Promise<void>) {
  const s = setupScenario(supremeConnectionTrashNeedsSecondMatch({ secondMatch }));
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await verify(s);
  } finally {
    if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat as 0 | 1, { type: "surrender" });
    await loop;
  }
}

async function selectRevealed(s: EngineSetup, expectedCandidates: string[], picked: string) {
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const request = s.decisions.at(-1)!.req;
  expect(request.kind).toBe("selectCards");
  expect(request.options?.candidateInstanceIds).toEqual(expectedCandidates.map((alias) => s.inst(alias).instanceId));
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst(picked).instanceId] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.decisionId !== request.decisionId);
}

async function useSupremeConnection(s: EngineSetup) {
  const optionId = s.inst("supremeConnection").instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
}

async function waitForPlacement(s: EngineSetup) {
  const optionId = s.inst("supremeConnection").instanceId;
  await settle(
    () =>
      s.state.pendingDecision === undefined &&
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId),
  );
}

describe("Supreme Connection! trash needs a second Machine or Cyborg card", () => {
  it("adds the only matching card to hand and trashes nothing", async () => {
    await withScenario(false, async (s) => {
      await useSupremeConnection(s);
      await selectRevealed(s, ["cyborgMatch"], "cyborgMatch");
      await waitForPlacement(s);
      const player = s.state.players[0]!;
      expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
      expect(player.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("cyborgMatch").instanceId);
      expect(player.trash.map(({ instanceId }) => instanceId)).toEqual([]);
      expect(
        player.deck
          .slice(0, 4)
          .map(({ instanceId }) => instanceId)
          .sort(),
      ).toEqual(
        ["revealedOption", "revealedMeat", "secondRevealedDigimon", "mutantThundermon"]
          .map((alias) => s.inst(alias).instanceId)
          .sort(),
      );
      expect(s.state.memory).toBe(0);
    });
  });

  it("asks for the trash pick when two matching cards are revealed", async () => {
    await withScenario(true, async (s) => {
      await useSupremeConnection(s);
      await selectRevealed(s, ["cyborgMatch", "secondRevealedDigimon"], "cyborgMatch");
      await selectRevealed(s, ["secondRevealedDigimon"], "secondRevealedDigimon");
      await waitForPlacement(s);
      const player = s.state.players[0]!;
      expect(player.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("cyborgMatch").instanceId);
      expect(player.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("secondRevealedDigimon").instanceId]);
    });
  });
});
