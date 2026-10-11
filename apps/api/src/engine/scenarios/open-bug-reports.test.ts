import fixtureOpenBugsVeemonDecline from "./veemon-decline.fixture.js";
import fixtureOpenBugsLavorvomonSearch from "./lavorvomon-search.fixture.js";
import fixtureOpenBugsGiromonLeave from "./giromon-leave.fixture.js";
import fixtureOpenBugsKoromonEvolution from "./koromon-evolution.fixture.js";
import fixtureOpenBugsMegaKnightMaterials from "./mega-knight-materials.fixture.js";
import fixtureOpenBugsMarcusAttack from "./marcus-attack.fixture.js";
import fixtureOpenBugsLarvaImmunity from "./larva-immunity.fixture.js";

import { fixtureVariant, fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture, type ScenarioFixture } from "../scenario/fixture.js";
import { RED_DECK, BLUE_DECK } from "../testDecks.js";
import { setupEngine, settle, settleAcrossTimers } from "../testkit/harness.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";

const scenarios = [
  "veemon-decline",
  "lavorvomon-search",
  "giromon-leave",
  "koromon-evolution",
  "mega-knight-materials",
  "marcus-attack",
  "larva-immunity",
] as const;
it.each(scenarios)("open bug reports dev arena: %s", async (bug) => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      autoDeclineOptional: bug === "veemon-decline" || bug === "marcus-attack",
    },
  );
  layScenarioFixture(
    s.state,
    fixtureVariant(
      {
        "veemon-decline": fixtureOpenBugsVeemonDecline,
        "lavorvomon-search": fixtureOpenBugsLavorvomonSearch,
        "giromon-leave": fixtureOpenBugsGiromonLeave,
        "koromon-evolution": fixtureOpenBugsKoromonEvolution,
        "mega-knight-materials": fixtureOpenBugsMegaKnightMaterials,
        "marcus-attack": fixtureOpenBugsMarcusAttack,
        "larva-immunity": fixtureOpenBugsLarvaImmunity,
      },
      bug,
    ) as ScenarioFixture,
    [BLUE_DECK, RED_DECK],
    true,
  );
  s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const player = s.state.players[0]!;
    const play = (id: string) =>
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: fixtureVariant(
            {
              cost: fixtureInstanceId("open-bugs-cost-card"),
              lavorvomon: fixtureInstanceId("open-bugs-lavorvomon-card"),
              millennium: fixtureInstanceId("open-bugs-millennium-card"),
              agumon: fixtureInstanceId("open-bugs-agumon-card"),
              omnimon: fixtureInstanceId("open-bugs-omnimon-card"),
              wrong: fixtureInstanceId("open-bugs-wrong-card"),
              lord: fixtureInstanceId("open-bugs-lord-card"),
            },
            id,
          ),
        }),
      ).toEqual({ ok: true });
    switch (bug) {
      case "veemon-decline":
        expect(player.hand.some((c) => c.instanceId === fixtureInstanceId("open-bugs-cost-card"))).toBe(true);
        expect(player.trash).toHaveLength(0);
        break;
      case "lavorvomon-search":
        play("lavorvomon");
        await settle(() => player.hand.some((c) => c.cardId === "EX3-065") && !s.state.pendingDecision);
        expect(player.hand.some((c) => c.cardId === "EX3-011")).toBe(true);
        expect(player.deck.map((c) => c.cardId)).toEqual(["BT1-014", "BT1-009", "BT1-013"]);
        break;
      case "giromon-leave":
        play("millennium");
        await settle(() => s.state.players[1]!.security.length === 4 && !s.state.pendingDecision);
        expect(player.trash.some((c) => c.cardId === "BT26-055")).toBe(true);
        break;
      case "koromon-evolution":
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: fixturePermanentId("own-open-bugs-greymon"),
            instanceId: fixtureInstanceId("open-bugs-agumon-card"),
            useAlternateCost: true,
          }),
        ).toEqual({ ok: true });
        await settle(() => player.battleArea[0]!.topCard.cardId === "BT12-034" && !s.state.pendingDecision);
        expect(s.state.memory).toBe(10);
        break;
      case "mega-knight-materials":
        play("millennium");
        await settle(() => player.battleArea.some((p) => p.topCard.cardId === "EX13-016") && !s.state.pendingDecision);
        expect(player.battleArea.filter((p) => p.topCard.cardId === "BT17-095")).toHaveLength(1);
        break;
      case "marcus-attack": {
        const marcus = player.battleArea.find((p) => p.topCard.cardId === "BT12-092")!;
        expect(marcus.canAttackPlayer).toBe(true);
        expect(marcus.currentDP).toBe(12000);
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: marcus.permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await advance(s.engine).finishAttack();
        expect(marcus.isSuspended).toBe(true);
        expect(s.state.players[1]!.security).toHaveLength(4);
        break;
      }
      case "larva-immunity": {
        play("lord");
        const larva = player.battleArea.find((p) => p.topCard.cardId === "BT18-086")!;
        await settle(() => observe(s.engine).isRestrictedByEffect(larva, "beAffected", "Digimon"));
        advance(s.engine).endMainPhaseIfOpen(0);
        await settleAcrossTimers(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(1);
        expect(
          s.engine.applyIntent(1, { type: "playCard", instanceId: fixtureInstanceId("open-bugs-second-ebon-card") }),
        ).toEqual({
          ok: true,
        });
        await settle(
          () =>
            s.events.some(
              (e) =>
                e.kind === "effectResolved" && e.sourceInstanceId === fixtureInstanceId("open-bugs-second-ebon-card"),
            ) && !s.state.pendingDecision,
        );
        expect(player.battleArea.includes(larva)).toBe(true);
        advance(s.engine).endMainPhaseIfOpen(1);
        await settleAcrossTimers(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
        expect(player.battleArea.includes(larva)).toBe(true);
        expect(observe(s.engine).isRestrictedByEffect(larva, "beAffected", "Digimon")).toBe(false);
        break;
      }
    }
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
