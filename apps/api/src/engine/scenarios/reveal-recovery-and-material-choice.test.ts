import { fixtureVariant } from "../scenario/references.js";
import fixtureSukamonBt11DeletionSearch from "./sukamon-bt11-deletion-search.fixture.js";
import fixtureSukamonBt3DeletionSearch from "./sukamon-bt3-deletion-search.fixture.js";
import fixtureSukamonEx13DeletionSearch from "./sukamon-ex13-deletion-search.fixture.js";
import fixtureTrashRecovery from "./trash-recovery.fixture.js";
import fixtureRevealedSearch from "./revealed-search.fixture.js";
import fixtureMastemonOwnerSecurity from "./mastemon-owner-security.fixture.js";
import fixtureKyoBarrier from "./kyo-barrier.fixture.js";
import fixtureMillenniumDeckOrder from "./millennium-deck-order.fixture.js";
import fixtureKazemonBlast from "./kazemon-blast.fixture.js";
import fixtureGiromonAssembly from "./giromon-assembly.fixture.js";
import fixtureAsunaJupiter from "./asuna-jupiter.fixture.js";
import fixtureKingSukamonAssembly from "./king-sukamon-assembly.fixture.js";
import fixtureDorbickmonDigixros from "./dorbickmon-digixros.fixture.js";
import fixtureChuumonTrashRevival from "./chuumon-trash-revival.fixture.js";
import fixtureSnowGoblimonReveal from "./snow-goblimon-reveal.fixture.js";
import { fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";
import { EffectTiming, Phase, type CardInstance } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture, type ScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle, type SetupEngineOptions } from "../testkit/harness.js";
import { effectsOf } from "../effects/collect.js";
import type { CardSource } from "../effects/CardSource.js";

async function launch(id: ScenarioFixture, options: SetupEngineOptions = {}) {
  const s = setupEngine({ 0: {}, 1: {} }, options);
  layScenarioFixture(s.state, id, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
  const field = (slot: string, seat: 0 | 1 = 0) =>
    s.state.players[seat]!.battleArea.find(
      (p) =>
        p.permanentId ===
        fixtureVariant(
          {
            egg: fixtureInstanceId("latest-egg-card"),
            sukamon: fixturePermanentId("latest-sukamon"),
            target: fixturePermanentId("latest-target"),
            "revival-host": fixturePermanentId("latest-revival-host"),
            "revival-enemy": fixturePermanentId("latest-revival-enemy"),
            dorbickmon: fixtureInstanceId("latest-dorbickmon-card"),
            matt: fixtureInstanceId("latest-matt-card"),
            "purple-digimon": fixtureInstanceId("latest-purple-digimon-card"),
            "purple-option": fixtureInstanceId("latest-purple-option-card"),
            davis: fixtureInstanceId("latest-davis-card"),
            mastemon: fixturePermanentId("latest-mastemon"),
            kyo: fixturePermanentId("latest-kyo"),
            aegiomon: fixturePermanentId("latest-aegiomon"),
            millennium: fixtureInstanceId("latest-millennium-card"),
            kimera: fixturePermanentId("latest-kimera"),
            machine: fixturePermanentId("latest-machine"),
            three: fixtureInstanceId("latest-three-card"),
            four: fixtureInstanceId("latest-four-card"),
            five: fixtureInstanceId("latest-five-card"),
            aldamon: fixturePermanentId("latest-aldamon"),
            zephagamon: fixtureInstanceId("latest-zephagamon-card"),
            option: fixtureInstanceId("latest-option-card"),
            jupiter: fixtureInstanceId("latest-jupiter-card"),
            asuna: fixturePermanentId("latest-asuna"),
            aegiochus: fixturePermanentId("latest-aegiochus"),
          },
          slot,
        ),
    )!;
  const attack = (slot: string) =>
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: field(slot).permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  const finish = async () => {
    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  };
  return { s, field, attack, finish };
}
it.each([
  [fixtureSukamonBt11DeletionSearch, "BT11-040", "hand"],
  [fixtureSukamonBt3DeletionSearch, "BT3-063", "play"],
  [fixtureSukamonEx13DeletionSearch, "EX13-028", "play"],
] as const)(
  "Sukamon deletion arena %s: select a revealed card and resolve its printed destination",
  async (id, source, to) => {
    const { s, field, finish } = await launch(id, { autoAcceptOptional: true, autoOrderCards: true });
    const sourceId = field("sukamon").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: field("sukamon").permanentId,
        target: { kind: "permanent", permanentId: field("target", 1).permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const request = s.decisions.at(-1)!.req;
    expect(request.sourceCardId).toBe(source);
    expect(request.options?.visibleCards?.map((card) => card.instanceId)).toEqual([
      fixtureInstanceId("latest-sukamon-reveal-1-card"),
      fixtureInstanceId("latest-sukamon-reveal-2-card"),
      fixtureInstanceId("latest-sukamon-reveal-3-card"),
    ]);
    expect(request.options?.candidateInstanceIds).toEqual([
      fixtureInstanceId("latest-sukamon-reveal-1-card"),
      fixtureInstanceId("latest-sukamon-reveal-2-card"),
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "selectCards", instanceIds: [fixtureInstanceId("latest-sukamon-reveal-1-card")] },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
    const player = s.state.players[0]!;
    expect(player.battleArea.some((p) => p.permanentId === fixturePermanentId("latest-sukamon"))).toBe(false);
    expect(player.trash.map((c) => c.instanceId)).toContain(sourceId);
    const chosenDestination =
      to === "hand" ? player.hand.map((c) => c.instanceId) : player.battleArea.map((p) => p.topCard.instanceId);
    expect(chosenDestination).toContain(fixtureInstanceId("latest-sukamon-reveal-1-card"));
    const remainder = [
      fixtureInstanceId("latest-sukamon-reveal-2-card"),
      fixtureInstanceId("latest-sukamon-reveal-3-card"),
    ];
    const remainderDestination = source === "BT3-063" ? player.deck.slice(-2) : player.trash;
    expect(remainderDestination.map((c) => c.instanceId)).toEqual(expect.arrayContaining(remainder));
    expect(s.state.memory).toBe(10);
    await finish();
  },
);
it.each(["purple-digimon", "purple-option"])("arena: Matt recovers the selected %s from trash", async (slot) => {
  const { s, finish } = await launch(fixtureTrashRecovery);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("latest-matt-card") })).toEqual({
    ok: true,
  });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const request = s.decisions.at(-1)!.req;
  expect(request.options?.candidateInstanceIds).toEqual([
    fixtureInstanceId("latest-purple-digimon-card"),
    fixtureInstanceId("latest-purple-option-card"),
  ]);
  const selected = fixtureVariant(
    {
      egg: fixtureInstanceId("latest-egg-card"),
      sukamon: fixturePermanentId("latest-sukamon"),
      target: fixturePermanentId("latest-target"),
      "revival-host": fixturePermanentId("latest-revival-host"),
      "revival-enemy": fixturePermanentId("latest-revival-enemy"),
      dorbickmon: fixtureInstanceId("latest-dorbickmon-card"),
      matt: fixtureInstanceId("latest-matt-card"),
      "purple-digimon": fixtureInstanceId("latest-purple-digimon-card"),
      "purple-option": fixtureInstanceId("latest-purple-option-card"),
      davis: fixtureInstanceId("latest-davis-card"),
      mastemon: fixturePermanentId("latest-mastemon"),
      kyo: fixturePermanentId("latest-kyo"),
      aegiomon: fixturePermanentId("latest-aegiomon"),
      millennium: fixtureInstanceId("latest-millennium-card"),
      kimera: fixturePermanentId("latest-kimera"),
      machine: fixturePermanentId("latest-machine"),
      three: fixtureInstanceId("latest-three-card"),
      four: fixtureInstanceId("latest-four-card"),
      five: fixtureInstanceId("latest-five-card"),
      aldamon: fixturePermanentId("latest-aldamon"),
      zephagamon: fixtureInstanceId("latest-zephagamon-card"),
      option: fixtureInstanceId("latest-option-card"),
      jupiter: fixtureInstanceId("latest-jupiter-card"),
      asuna: fixturePermanentId("latest-asuna"),
      aegiochus: fixturePermanentId("latest-aegiochus"),
    },
    slot,
  );
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response: { kind: "selectCards", instanceIds: [selected] },
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(selected);
  expect(s.state.players[0]!.trash.map((c) => c.instanceId)).not.toContain(selected);
  expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(fixtureInstanceId("latest-illegal-red-card"));
  await finish();
});
it("arena: Davis selects revealed blue and green cards into hand", async () => {
  const { s, finish } = await launch(fixtureRevealedSearch, { autoOrderCards: true });
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("latest-davis-card") })).toEqual({
    ok: true,
  });
  let previous = "";
  for (const index of [1, 2]) {
    await settle(
      () => s.state.pendingDecision?.kind === "selectCards" && s.state.pendingDecision.decisionId !== previous,
    );
    const request = s.decisions.at(-1)!.req;
    expect(request.options?.visibleCards).toEqual([
      { instanceId: fixtureInstanceId("latest-reveal-1-card"), cardId: "BT1-027" },
      { instanceId: fixtureInstanceId("latest-reveal-2-card"), cardId: "BT1-064" },
      { instanceId: fixtureInstanceId("latest-reveal-3-card"), cardId: "BT1-010" },
    ]);
    expect(request.options?.candidateInstanceIds).toEqual([
      fixtureVariant(
        {
          "0": fixtureInstanceId("latest-reveal-0-card"),
          "1": fixtureInstanceId("latest-reveal-1-card"),
          "2": fixtureInstanceId("latest-reveal-2-card"),
          "3": fixtureInstanceId("latest-reveal-3-card"),
          "4": fixtureInstanceId("latest-reveal-4-card"),
          "5": fixtureInstanceId("latest-reveal-5-card"),
          "6": fixtureInstanceId("latest-reveal-6-card"),
          "7": fixtureInstanceId("latest-reveal-7-card"),
          "8": fixtureInstanceId("latest-reveal-8-card"),
          "9": fixtureInstanceId("latest-reveal-9-card"),
          "10": fixtureInstanceId("latest-reveal-10-card"),
          "11": fixtureInstanceId("latest-reveal-11-card"),
          "12": fixtureInstanceId("latest-reveal-12-card"),
          "13": fixtureInstanceId("latest-reveal-13-card"),
          "14": fixtureInstanceId("latest-reveal-14-card"),
          "15": fixtureInstanceId("latest-reveal-15-card"),
          "16": fixtureInstanceId("latest-reveal-16-card"),
          "17": fixtureInstanceId("latest-reveal-17-card"),
          "18": fixtureInstanceId("latest-reveal-18-card"),
          "19": fixtureInstanceId("latest-reveal-19-card"),
        },
        index,
      ),
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [
            fixtureVariant(
              {
                "0": fixtureInstanceId("latest-reveal-0-card"),
                "1": fixtureInstanceId("latest-reveal-1-card"),
                "2": fixtureInstanceId("latest-reveal-2-card"),
                "3": fixtureInstanceId("latest-reveal-3-card"),
                "4": fixtureInstanceId("latest-reveal-4-card"),
                "5": fixtureInstanceId("latest-reveal-5-card"),
                "6": fixtureInstanceId("latest-reveal-6-card"),
                "7": fixtureInstanceId("latest-reveal-7-card"),
                "8": fixtureInstanceId("latest-reveal-8-card"),
                "9": fixtureInstanceId("latest-reveal-9-card"),
                "10": fixtureInstanceId("latest-reveal-10-card"),
                "11": fixtureInstanceId("latest-reveal-11-card"),
                "12": fixtureInstanceId("latest-reveal-12-card"),
                "13": fixtureInstanceId("latest-reveal-13-card"),
                "14": fixtureInstanceId("latest-reveal-14-card"),
                "15": fixtureInstanceId("latest-reveal-15-card"),
                "16": fixtureInstanceId("latest-reveal-16-card"),
                "17": fixtureInstanceId("latest-reveal-17-card"),
                "18": fixtureInstanceId("latest-reveal-18-card"),
                "19": fixtureInstanceId("latest-reveal-19-card"),
              },
              index,
            ),
          ],
        },
      }),
    ).toEqual({ ok: true });
    previous = request.decisionId;
  }
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual(
    expect.arrayContaining([fixtureInstanceId("latest-reveal-1-card"), fixtureInstanceId("latest-reveal-2-card")]),
  );
  expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(fixtureInstanceId("latest-reveal-3-card"));
  await finish();
});
it("arena: Mastemon excludes Tamers and preserves the security owner's seat", async () => {
  const preferred = [fixturePermanentId("latest-target")];
  const { s, field, attack, finish } = await launch(fixtureMastemonOwnerSecurity, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    preferInstanceIds: preferred,
  });
  const target = field("target", 1).topCard.instanceId;
  attack("mastemon");
  await advance(s.engine).finishAttack();
  expect(s.state.players[1]!.security.at(-1)?.instanceId).toBe(target);
  expect(s.state.players[0]!.security.map((c) => c.instanceId)).not.toContain(target);
  const choices = s.decisions.filter(({ req }) => req.kind === "chooseTargets" && req.sourceCardId === "BT23-102");
  expect(choices).toHaveLength(1);
  for (const { req } of choices) {
    expect(req.options?.candidateInstanceIds).not.toContain(fixturePermanentId("latest-own-tamer"));
    expect(req.options?.candidateInstanceIds).not.toContain(fixturePermanentId("latest-opponent-tamer"));
  }
  await finish();
});
it("arena: Kyo's effect-removal clause applies after Barrier", async () => {
  const { s, field, attack, finish } = await launch(fixtureKyoBarrier, {
    autoAcceptOptional: true,
    autoSelectCards: true,
  });
  attack("aegiomon");
  await settle(() => s.events.some((e) => e.kind === "barrierPrompt"));
  expect(
    s.engine.applyIntent(0, { type: "respondBarrier", permanentId: field("aegiomon").permanentId, accept: true }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(field("kyo").isSuspended).toBe(true);
  expect(field("kyo").stack).toHaveLength(1);
  expect(observe(s.engine).keywordAmount(field("target", 1), "SecurityAttack")).toBe(-1);
  await finish();
});
it("arena: DNA return asks the activating player for deck-top order", async () => {
  const { s, field, finish } = await launch(fixtureMillenniumDeckOrder, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoOrderCards: false,
  });
  const before = s.state.memory;
  expect(
    s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      instanceId: fixtureInstanceId("latest-millennium-card"),
      materialPermanentIds: [field("kimera").permanentId, field("machine").permanentId],
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderCards");
  expect(s.state.pendingDecision?.seat).toBe(0);
  const order = [
    fixtureInstanceId("latest-five-card"),
    fixtureInstanceId("latest-three-card"),
    fixtureInstanceId("latest-four-card"),
  ];
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "orderCards", order },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.players[1]!.deck.slice(0, 3).map((c) => c.instanceId)).toEqual(order);
  expect(s.state.memory).toBe(before + 3);
  await finish();
});
it("arena: timeout cannot overtake Kazemon's accepted Blast resolution", async () => {
  const { s, field, attack, finish } = await launch(fixtureKazemonBlast, {
    autoAcceptOptional: true,
    autoSelectCards: true,
  });
  const takuya = field("aldamon").stack.find((c) => c.cardId === "BT12-088")!.instanceId;
  const aldamon = field("aldamon").topCard.instanceId;
  attack("aldamon");
  await settle(() => s.engine.combat.hasOpenCounterWindow);
  const window = s.events.find((e) => e.kind === "counterWindowOpened");
  if (window?.kind !== "counterWindowOpened") throw new Error("No Counter window");
  const counter = window.eligibleCounters.find((c) => c.instanceId === fixtureInstanceId("latest-zephagamon-card"))!;
  expect(
    s.engine.applyIntent(1, {
      type: "respondCounter",
      sourceInstanceId: counter.instanceId,
      effectKey: counter.effectKey,
    }),
  ).toEqual({ ok: true });
  expect(s.engine.expireCombatWindow()).toBe(false);
  await settle(() => s.events.some((e) => e.kind === "effectActivated" && e.sourceCardId === "BT20-101"));
  await advance(s.engine).finishAttack();
  expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toContain(takuya);
  expect(s.state.players[0]!.deck.map((c) => c.instanceId)).toContain(aldamon);
  await finish();
});
it("arena: Assembly's Giromon source trashes security before self-deletion", async () => {
  const { s, finish } = await launch(fixtureGiromonAssembly, {
    autoAcceptOptional: true,
    autoSelectCards: true,
  });
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: fixtureInstanceId("latest-millennium-card"),
      assembly: {
        materialInstanceIds: [
          fixtureInstanceId("latest-three-card"),
          fixtureInstanceId("latest-four-card"),
          fixtureInstanceId("latest-five-card"),
        ],
      },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.trash.some((c) => c.instanceId === fixtureInstanceId("latest-millennium-card")) &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(s.state.players[1]!.security).toHaveLength(2);
  await finish();
});
it("arena: Asuna evolves into Jupitermon for zero with one security", async () => {
  const options: SetupEngineOptions = {
    autoDeclineOptional: true,
    autoSelectCards: true,
    autoChooseOption: true,
    preferOptionIndex: 1,
    preferInstanceIds: [
      fixtureInstanceId("latest-option-card"),
      fixturePermanentId("latest-aegiochus"),
      fixtureInstanceId("latest-jupiter-card"),
    ],
  };
  const { s, field, finish } = await launch(fixtureAsunaJupiter, options);
  options.autoDeclineOptional = false;
  options.autoAcceptOptional = true;
  const before = s.state.memory;
  const source = (s.engine as unknown as { cardSourceOf: (c: CardInstance) => CardSource }).cardSourceOf(
    field("asuna").topCard,
  );
  const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((e) =>
    e.effectKey.startsWith("BT25-092/"),
  )!.effectKey;
  expect(
    s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: field("asuna").topCard.instanceId, effectKey }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      field("aegiochus").topCard.cardId === "BT24-101" &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(s.state.memory).toBe(before);
  expect(field("asuna").isSuspended).toBe(true);
  expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(fixtureInstanceId("latest-option-card"));
  await finish();
});

it("KingSukamon selects three trash Assembly materials and pays 3", async () => {
  const { s, finish } = await launch(fixtureKingSukamonAssembly, { autoDeclineOptional: true });
  const materials = [0, 1, 2].map((index) =>
    fixtureVariant(
      {
        "0": fixtureInstanceId("latest-king-material-0-card"),
        "1": fixtureInstanceId("latest-king-material-1-card"),
        "2": fixtureInstanceId("latest-king-material-2-card"),
      },
      index,
    ),
  );
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: fixtureInstanceId("latest-king-sukamon-card"),
      assembly: { materialInstanceIds: materials },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX13-031") &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  const king = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX13-031")!;
  expect(king.stack.map((c) => c.instanceId)).toEqual([...materials].reverse());
  expect(s.state.players[0]!.trash).toHaveLength(0);
  expect(s.state.memory).toBe(7);
  await finish();
});

it("Dorbickmon selects five hand DigiXros materials and pays 3", async () => {
  const { s, finish } = await launch(fixtureDorbickmonDigixros);
  const materials = [0, 1, 2, 3, 4].map((index) =>
    fixtureVariant(
      {
        "0": fixtureInstanceId("latest-dorbickmon-material-0-card"),
        "1": fixtureInstanceId("latest-dorbickmon-material-1-card"),
        "2": fixtureInstanceId("latest-dorbickmon-material-2-card"),
        "3": fixtureInstanceId("latest-dorbickmon-material-3-card"),
        "4": fixtureInstanceId("latest-dorbickmon-material-4-card"),
      },
      index,
    ),
  );
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: fixtureInstanceId("latest-dorbickmon-card"),
      digiXros: { materialInstanceIds: materials },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX3-014") &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  const source = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX3-014")!;
  expect(source.stack.map((c) => c.instanceId)).toEqual(expect.arrayContaining(materials));
  expect(source.stack).toHaveLength(5);
  expect(s.state.memory).toBe(7);
  await finish();
});

it("EX5 Chuumon's inherited deletion selects and plays a trash Chuumon suspended", async () => {
  const { s, field, finish } = await launch(fixtureChuumonTrashRevival, { autoAcceptOptional: true });
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: field("revival-host").permanentId,
      target: { kind: "permanent", permanentId: field("revival-enemy", 1).permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.state.pendingDecision?.kind === "chooseTargets" || s.state.pendingDecision?.kind === "selectCards",
  );
  const request = s.decisions.at(-1)!.req;
  expect(request.sourceCardId).toBe("EX5-045");
  expect(request.options?.candidateInstanceIds).toContain(fixtureInstanceId("latest-revival-target-card"));
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response: {
        kind: request.kind as "chooseTargets" | "selectCards",
        instanceIds: [fixtureInstanceId("latest-revival-target-card")],
      },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  const revived = s.state.players[0]!.battleArea.find(
    (p) => p.topCard.instanceId === fixtureInstanceId("latest-revival-target-card"),
  );
  expect(revived?.isSuspended).toBe(true);
  expect(s.state.players[0]!.trash.map((c) => c.instanceId)).not.toContain(
    fixtureInstanceId("latest-revival-target-card"),
  );
  await finish();
});

it("SnowGoblimon shows all three reveals, adds both legal cards and discards from hand", async () => {
  const { s, finish } = await launch(fixtureSnowGoblimonReveal, { autoOrderCards: true });
  expect(
    s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("latest-snow-goblimon-card") }),
  ).toEqual({ ok: true });
  let previous = "";
  for (const index of [1, 2]) {
    await settle(
      () => s.state.pendingDecision?.kind === "selectCards" && s.state.pendingDecision.decisionId !== previous,
    );
    const request = s.decisions.at(-1)!.req;
    expect(request.options?.visibleCards?.map((c) => c.instanceId)).toEqual([
      fixtureInstanceId("latest-snow-reveal-1-card"),
      fixtureInstanceId("latest-snow-reveal-2-card"),
      fixtureInstanceId("latest-snow-reveal-3-card"),
    ]);
    expect(request.options?.candidateInstanceIds).toContain(
      fixtureVariant(
        {
          "0": fixtureInstanceId("latest-snow-reveal-0-card"),
          "1": fixtureInstanceId("latest-snow-reveal-1-card"),
          "2": fixtureInstanceId("latest-snow-reveal-2-card"),
          "3": fixtureInstanceId("latest-snow-reveal-3-card"),
          "4": fixtureInstanceId("latest-snow-reveal-4-card"),
          "5": fixtureInstanceId("latest-snow-reveal-5-card"),
          "6": fixtureInstanceId("latest-snow-reveal-6-card"),
          "7": fixtureInstanceId("latest-snow-reveal-7-card"),
          "8": fixtureInstanceId("latest-snow-reveal-8-card"),
          "9": fixtureInstanceId("latest-snow-reveal-9-card"),
          "10": fixtureInstanceId("latest-snow-reveal-10-card"),
          "11": fixtureInstanceId("latest-snow-reveal-11-card"),
          "12": fixtureInstanceId("latest-snow-reveal-12-card"),
          "13": fixtureInstanceId("latest-snow-reveal-13-card"),
          "14": fixtureInstanceId("latest-snow-reveal-14-card"),
          "15": fixtureInstanceId("latest-snow-reveal-15-card"),
          "16": fixtureInstanceId("latest-snow-reveal-16-card"),
          "17": fixtureInstanceId("latest-snow-reveal-17-card"),
          "18": fixtureInstanceId("latest-snow-reveal-18-card"),
          "19": fixtureInstanceId("latest-snow-reveal-19-card"),
        },
        index,
      ),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [
            fixtureVariant(
              {
                "0": fixtureInstanceId("latest-snow-reveal-0-card"),
                "1": fixtureInstanceId("latest-snow-reveal-1-card"),
                "2": fixtureInstanceId("latest-snow-reveal-2-card"),
                "3": fixtureInstanceId("latest-snow-reveal-3-card"),
                "4": fixtureInstanceId("latest-snow-reveal-4-card"),
                "5": fixtureInstanceId("latest-snow-reveal-5-card"),
                "6": fixtureInstanceId("latest-snow-reveal-6-card"),
                "7": fixtureInstanceId("latest-snow-reveal-7-card"),
                "8": fixtureInstanceId("latest-snow-reveal-8-card"),
                "9": fixtureInstanceId("latest-snow-reveal-9-card"),
                "10": fixtureInstanceId("latest-snow-reveal-10-card"),
                "11": fixtureInstanceId("latest-snow-reveal-11-card"),
                "12": fixtureInstanceId("latest-snow-reveal-12-card"),
                "13": fixtureInstanceId("latest-snow-reveal-13-card"),
                "14": fixtureInstanceId("latest-snow-reveal-14-card"),
                "15": fixtureInstanceId("latest-snow-reveal-15-card"),
                "16": fixtureInstanceId("latest-snow-reveal-16-card"),
                "17": fixtureInstanceId("latest-snow-reveal-17-card"),
                "18": fixtureInstanceId("latest-snow-reveal-18-card"),
                "19": fixtureInstanceId("latest-snow-reveal-19-card"),
              },
              index,
            ),
          ],
        },
      }),
    ).toEqual({ ok: true });
    previous = request.decisionId;
  }
  await settle(() => !!s.state.pendingDecision && s.state.pendingDecision.decisionId !== previous);
  const discard = s.decisions.at(-1)!.req;
  expect(discard.options?.candidateInstanceIds).toContain(fixtureInstanceId("latest-snow-discard-card"));
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: discard.decisionId,
      response: {
        kind: discard.kind as "chooseTargets" | "selectCards",
        instanceIds: [fixtureInstanceId("latest-snow-discard-card")],
      },
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual(
    expect.arrayContaining([
      fixtureInstanceId("latest-snow-reveal-1-card"),
      fixtureInstanceId("latest-snow-reveal-2-card"),
    ]),
  );
  expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(fixtureInstanceId("latest-snow-discard-card"));
  expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(fixtureInstanceId("latest-snow-reveal-3-card"));
  await finish();
});
