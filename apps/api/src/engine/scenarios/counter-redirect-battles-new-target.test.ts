import { describe, expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle, settleAcrossTimers } from "#api/engine/testkit/harness";
import { fixtureInstanceId, fixturePermanentId } from "#api/engine/scenario/references";
import fixture from "#api/engine/scenarios/counter-redirect-battles-new-target.fixture";
import "#api/cards/index";

const withoutDnaResult = {
  ...fixture,
  board: { ...fixture.board, 0: { ...fixture.board[0], hand: [] } },
};

const blastDigivolve = {
  ...fixture,
  board: {
    ...fixture.board,
    0: {
      ...fixture.board[0],
      battleArea: [{ card: "BT1-073", as: "kabuterimon" }],
      hand: [{ card: "BT15-049", as: "megakabuterimonCard" }],
    },
  },
};

describe("a Counter that changes the attack target", () => {
  it.each([
    { variant: "after DNA digivolving", board: fixture, counterAlias: "wargreymonCard", defenderCardId: "EX12-037" },
    {
      variant: "without a DNA result",
      board: withoutDnaResult,
      counterAlias: "wargreymonCard",
      defenderCardId: "EX12-017",
    },
    {
      variant: "after Blast Digivolve",
      board: blastDigivolve,
      counterAlias: "megakabuterimonCard",
      defenderCardId: "BT15-049",
    },
  ])(
    "battles the new target instead of checking security ($variant)",
    async ({ board, counterAlias, defenderCardId }) => {
      const s = setupScenario(board, {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: [
          fixturePermanentId("bystander"),
          fixturePermanentId("wargreymon"),
          fixturePermanentId("kabuterimon"),
        ],
      });
      const loop = s.engine.startTurnLoop();
      try {
        await advance(s.engine).waitForMainPhase(1);
        const ogremon = s.perm("ogremon").permanentId;
        expect(
          s.engine.applyIntent(1, { type: "attack", attackerPermanentId: ogremon, target: { kind: "player" } }),
        ).toEqual({ ok: true });
        await settle(() => s.state.combatWindow?.kind === "counter");
        const opened = s.events.find((event) => event.kind === "counterWindowOpened");
        const eligible = opened?.kind === "counterWindowOpened" ? opened.eligibleCounters : [];
        expect(eligible).toHaveLength(1);
        const counter = eligible[0];
        expect(counter?.instanceId).toBe(fixtureInstanceId(counterAlias));
        expect(
          s.engine.applyIntent(0, {
            type: "respondCounter",
            sourceInstanceId: counter!.instanceId,
            effectKey: counter!.effectKey,
          }),
        ).toEqual({ ok: true });
        await settleAcrossTimers(
          () =>
            !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === ogremon) &&
            s.state.combatWindow === undefined &&
            s.state.pendingDecision === undefined,
        );

        const redirect = s.events.find((event) => event.kind === "attackDeclared" && event.redirected === true);
        expect(redirect).toMatchObject({ target: { kind: "permanent" }, targetCardId: defenderCardId });
        const defender = s.state.players[0]!.battleArea.find(
          (permanent) => permanent.topCard.cardId === defenderCardId,
        );
        expect(s.events.find((event) => event.kind === "battleCompared")).toMatchObject({
          attackerPermanentId: ogremon,
          defenderPermanentId: defender?.permanentId,
          loserPermanentIds: [ogremon],
        });
        expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
        expect(s.state.players[0]!.security).toHaveLength(3);
        expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-069");
      } finally {
        s.engine.applyIntent(1, { type: "surrender" });
        await loop;
      }
    },
  );
});
