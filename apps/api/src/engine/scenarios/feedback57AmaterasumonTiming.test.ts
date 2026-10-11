import prepared0 from "./amaterasumon-empty-resolution.fixture.js";
import prepared1 from "./amaterasumon-paid-resolution.fixture.js";
import { fixtureVariant, fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";

/* oxlint-disable vitest/no-conditional-expect -- Fixed table modes select independent printed-rule outcomes. */
import { expect, it } from "vitest";
import { Phase, type Permanent } from "@aegis/shared";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";

import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

const preparedFixtures = { "amaterasumon-empty-resolution": prepared0, "amaterasumon-paid-resolution": prepared1 };

it.each(["empty", "pay", "decline"] as const)(
  "Feedback #57: Amaterasumon's %s resolution finishes before the second security check",
  async (mode) => {
    const paid = mode === "pay";
    let target: Permanent | undefined;
    let targetDPAtSecondCheck: number | undefined;
    const s = setupEngine({
      onEvent: (event) => {
        if (event.kind === "securityRevealed" && event.revealedCardId === "EX12-035")
          targetDPAtSecondCheck = target?.currentDP;
      },
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferOptionIndex: 1,
      preferInstanceIds: [
        fixtureInstanceId("feedback57-return-red"),
        fixtureInstanceId("feedback57-return-blue"),
        fixturePermanentId("dev-perm-1-feedback57-target"),
      ],
      declinePrompts: [
        "Ascension",
        "Amaterasumon",
        "Return 1 to hand",
        "Play without paying",
        ...(mode === "decline" ? ["returning 2"] : []),
      ],
    });
    layScenarioFixture(
      s.state,
      fixtureVariant(
        preparedFixtures,
        mode === "empty" ? "amaterasumon-empty-resolution" : "amaterasumon-paid-resolution",
      ),
    );
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const attacker = human.battleArea[0]!;
    target = opponent.battleArea.find((p) => p.permanentId === fixturePermanentId("dev-perm-1-feedback57-target"));
    const sourceIds = [attacker.topCard.instanceId, ...attacker.stack.map((c) => c.instanceId)];
    const originalOpponentDeck = opponent.deck.map((c) => c.instanceId);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const deckBefore = human.deck.length;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: attacker.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.events.some((e) => e.kind === "attackEnded") && !s.state.pendingDecision && s.state.turnSeat === 1,
      );
      const evolved = s.events.find((e) => e.kind === "digivolved" && e.cardId === "EX12-047");
      expect(evolved).toMatchObject({ permanentId: attacker.permanentId, mechanic: "normal" });
      expect(human.deck).toHaveLength(deckBefore - 1);
      const resolved = s.events.findIndex(
        (e) => e.kind === "effectResolved" && e.sourceCardId === "EX12-047" && e.timing === "WhenDigivolving",
      );
      const firstChecked = s.events.findIndex((e) => e.kind === "securityChecked" && e.revealedCardId === "LM-058");
      const secondReveal = s.events.findIndex((e) => e.kind === "securityRevealed" && e.revealedCardId === "EX12-035");
      expect(resolved).toBeGreaterThan(-1);
      expect(firstChecked).toBeGreaterThan(resolved);
      expect(secondReveal).toBeGreaterThan(firstChecked);
      expect(
        s.events.some((e) => e.kind === "effectTriggered" && e.sourceCardId === "EX12-047" && e.timing === "OnPlay"),
      ).toBe(false);
      expect(opponent.security.map((c) => c.instanceId)).toEqual([fixtureInstanceId("feedback57-last-security")]);
      expect(opponent.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("feedback57-parkour"))).toBe(
        true,
      );
      expect(opponent.trash.map((c) => c.instanceId)).not.toContain(fixtureInstanceId("feedback57-parkour"));
      expect(opponent.breeding?.topCard.cardId).toBe("EX5-015");
      const secondBattle = s.events.find((e) => e.kind === "securityChecked" && e.revealedCardId === "EX12-035");
      expect(secondBattle).toMatchObject({
        battle: { attackerDP: paid ? 18000 : 12000, securityCardDP: 12000, attackerDeleted: !paid },
      });
      if (paid) {
        const returned = s.events.findIndex(
          (e) =>
            e.kind === "cardsMoved" &&
            e.to === "deckBottom" &&
            [fixtureInstanceId("feedback57-return-red"), fixtureInstanceId("feedback57-return-blue")].every((id) =>
              e.instanceIds.includes(id),
            ),
        );
        expect(returned).toBeGreaterThan(-1);
        expect(returned).toBeLessThan(resolved);
        expect(attacker.topCard.instanceId).toBe(fixtureInstanceId("feedback57-amaterasu"));
        expect(attacker.stack.map((c) => c.instanceId)).toEqual([sourceIds[1], sourceIds[0]]);
        expect(attacker.isSuspended).toBe(true);
        expect(human.trash).toHaveLength(0);
        expect(opponent.deck.map((c) => c.instanceId)).toEqual([
          ...originalOpponentDeck.slice(3),
          fixtureInstanceId("feedback57-parkour-bottom"),
          fixtureInstanceId("feedback57-return-red"),
          fixtureInstanceId("feedback57-return-blue"),
        ]);
      } else {
        expect(human.battleArea).toHaveLength(0);
        expect(human.trash.map((c) => c.instanceId)).toEqual(
          expect.arrayContaining([...sourceIds, fixtureInstanceId("feedback57-amaterasu")]),
        );
      }
      if (mode !== "empty") {
        expect(targetDPAtSecondCheck).toBe(paid ? 10000 : 20000);
        const deletion = s.events.findIndex(
          (e) =>
            e.kind === "cardsMoved" &&
            e.to === "trash" &&
            e.instanceIds.includes(fixtureInstanceId("dev-field-1-feedback57-lowest")),
        );
        expect(deletion).toBeGreaterThan(-1);
        expect(deletion).toBeLessThan(resolved);
        expect(opponent.trash.map((c) => c.instanceId)).toContain(fixtureInstanceId("dev-field-1-feedback57-lowest"));
        expect(
          opponent.battleArea.some((p) => p.permanentId === fixturePermanentId("dev-perm-1-feedback57-lowest")),
        ).toBe(false);
        expect(
          opponent.battleArea.find((p) => p.permanentId === fixturePermanentId("dev-perm-1-feedback57-target"))!
            .currentDP,
        ).toBe(20000);
        expect(opponent.trash.some((c) => c.instanceId === fixtureInstanceId("feedback57-return-red"))).toBe(!paid);
        expect(opponent.trash.some((c) => c.instanceId === fixtureInstanceId("feedback57-return-blue"))).toBe(!paid);
      } else {
        expect(
          s.decisions.filter(({ req }) => req.sourceCardId === "EX12-047" && req.options?.timing === "WhenDigivolving"),
        ).toHaveLength(0);
        expect(
          s.decisions.filter(({ req }) => req.sourceCardId === "EX12-047" && req.promptText?.includes("returning 2")),
        ).toHaveLength(0);
      }
      expect(s.state.memory).toBe(1);
      expect(s.state.phase).toBe(Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      assertNoLoudGap(s);
    } finally {
      if (s.state.phase === Phase.Breeding && !s.state.gameOver) {
        s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
        await advance(s.engine).waitForMainPhase(s.state.turnSeat);
      }
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);

it.each(["deletion-first", "ascension-first"] as const)(
  "orders Amaterasumon pending deletion effects with the standard resolution plan: %s",
  async (order) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-047", as: "amaterasu" }],
          security: ["BT1-009"],
          deck: Array(10).fill("BT1-009"),
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: false,
        declinePrompts: ["Return 1 to hand", "Play without paying"],
      },
    );
    await s.ready();
    const instanceId = s.perm("amaterasu").topCard.instanceId;
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("amaterasu").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const req = s.decisions.at(-1)!.req;
    const ascension = `ascension/${instanceId}`;
    const onDeletion = `on-deletion/${instanceId}`;
    expect(req).toMatchObject({
      sourceCardId: "EX12-047",
      sourceInstanceId: instanceId,
      options: {
        triggerKeys: [ascension, onDeletion],
        triggerCardIds: ["EX12-047", "EX12-047"],
        triggerTimings: ["Ascension", "OnDeletion"],
        acceptsResolutionPlan: true,
      },
    });
    expect(req.options!.triggerDescriptions![0]).toContain("Ascension");
    expect(req.options!.triggerDescriptions![1]).toMatch(/^\[On Deletion\]/);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: {
          kind: "orderTriggers",
          order: order === "deletion-first" ? [onDeletion, ascension] : [ascension, onDeletion],
        },
      }),
    ).toEqual({ ok: true });
    await deletion;
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[0]!.security.map((c) => c.instanceId)).toContain(instanceId);
    const nativeChoice = s.decisions.some(
      ({ req }) => req.sourceCardId === "EX12-047" && /Return 1 to hand/.test(req.promptText ?? ""),
    );
    expect(nativeChoice).toBe(order === "deletion-first");
    assertNoLoudGap(s);
  },
);

it("does not activate Ascension after On Deletion returns Amaterasumon to hand", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX12-047", as: "amaterasu" }],
        security: ["BT1-009"],
        deck: Array(10).fill("BT1-009"),
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
  );
  await s.ready();
  const instanceId = s.perm("amaterasu").topCard.instanceId;
  const deletion = advance(s.engine).verb.deletePermanent([s.perm("amaterasu").permanentId], "byEffect");
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const req = s.decisions.at(-1)!.req;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: req.decisionId,
      response: { kind: "orderTriggers", order: [`on-deletion/${instanceId}`, `ascension/${instanceId}`] },
    }),
  ).toEqual({ ok: true });
  await deletion;
  await settle(() => !s.state.pendingDecision);
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(instanceId);
  expect(s.state.players[0]!.security.map((c) => c.instanceId)).not.toContain(instanceId);
  expect(s.decisions.filter(({ req }) => req.options?.timing === "Ascension")).toHaveLength(0);
  assertNoLoudGap(s);
});

it.each([true, false])(
  "honors the Ascension answer in the pending-effect plan without another modal: %s",
  async (accept) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-047", as: "amaterasu" }],
          security: ["BT1-009"],
          deck: Array(10).fill("BT1-009"),
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: false,
        declinePrompts: ["Return 1 to hand", "Play without paying"],
      },
    );
    await s.ready();
    const instanceId = s.perm("amaterasu").topCard.instanceId;
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("amaterasu").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const req = s.decisions.at(-1)!.req;
    const ascension = `ascension/${instanceId}`;
    expect(req.options!.triggerIsOptional).toEqual([true]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: {
          kind: "orderTriggers",
          order: [`on-deletion/${instanceId}`, ascension],
          optionalAnswers: { [ascension]: accept },
        },
      }),
    ).toEqual({ ok: true });
    await deletion;
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[0]!.security.some((c) => c.instanceId === instanceId)).toBe(accept);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === instanceId)).toBe(!accept);
    expect(s.decisions.filter(({ req }) => req.options?.timing === "Ascension")).toHaveLength(0);
    assertNoLoudGap(s);
  },
);
