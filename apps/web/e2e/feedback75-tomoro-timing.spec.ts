import prepared0 from "../../api/src/engine/scenarios/tomoro-on-play.fixture";
import prepared1 from "../../api/src/engine/scenarios/tomoro-timing.fixture";
import { fixtureVariant, fixtureInstanceId, fixturePermanentId } from "../../api/src/engine/scenario/references";

const preparedFixtures = { "tomoro-on-play": prepared0, "tomoro-timing": prepared1 };

import { test, expect } from "./scenario-page";

const TOMORO = fixturePermanentId("dev-perm-0-feedback75-tomoro");
const GLOWING = fixturePermanentId("dev-perm-0-feedback75-glowing");
const ATTACKER = fixturePermanentId("dev-perm-1-feedback75-attacker");

test("Feedback #75: Tomoro places a source but gains no memory against an empty board", async ({ scenario }) => {
  await scenario.openFixture(fixtureVariant(preparedFixtures, "tomoro-on-play"));
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  expect((await scenario.snapshot()).memory).toBe(0);
  await scenario.play("Tomoro Tenma & Kyo Sawashiro", "Tamer");
  await scenario.resolveUntil((s) => s.turnSeat === 1 && s.phase === "Breeding" && !s.pendingDecision);
  const after = await scenario.snapshot();
  const tomoro = after.players[0]!.battleArea.find(
    (p) => p.topCard.instanceId === fixtureInstanceId("feedback75-tomoro"),
  )!;
  expect(tomoro.stack.map((card) => [card.instanceId, card.faceUp])).toEqual([
    [fixtureInstanceId("feedback75-deck-0-1"), false],
  ]);
  expect(after.memory).toBe(4);
  expect(after.players[0]!.trash).toHaveLength(0);
  expect(after.players[0]!.hand.map((card) => card.instanceId)).toEqual([
    fixtureInstanceId("feedback75-reserve"),
    fixtureInstanceId("feedback75-deck-0-0"),
  ]);
  expect(
    (await scenario.presentation()).events
      .filter((e) => e.kind === "memoryChanged" && e.reason === "payCost")
      .map((e) => (e.kind === "memoryChanged" ? [e.from, e.to] : [])),
  ).toEqual([[0, -4]]);
  await scenario.healthy();
});

test.describe("Tomoro's source payment response", () => {
  test.use({
    holdBotAfterTurn: 3,
    botMainIntents: [
      [{ type: "attack", attackerPermanentId: ATTACKER, target: { kind: "player" } }, { type: "endPhase" }],
      { scope: "test" },
    ],
  });

  for (const accept of [true, false]) {
    test(`Feedback #75: own-turn buff ${accept ? "accepted" : "declined"}, opponent payment never offers it`, async ({
      scenario,
      page,
    }) => {
      await page.setViewportSize({ width: accept ? 1440 : 390, height: accept ? 1000 : 844 });
      await page.addInitScript((dark) => localStorage.setItem("aegis:darkMode", String(dark)), !accept);
      await scenario.openFixture(fixtureVariant(preparedFixtures, "tomoro-timing"));
      await scenario.resolveUntil(
        (s) => s.phase === "Main" && !s.pendingDecision,
        () => ({ accept: false }),
      );
      expect((await scenario.snapshot()).memory).toBe(4);
      await scenario.play("Chiropmon", "Digimon");
      let ownBuffOffers = 0;
      await scenario.resolveUntil(
        (s) =>
          ownBuffOffers === 1 &&
          !s.pendingDecision &&
          s.memory === 1 &&
          s.players[0]!.hand.some((card) => card.instanceId === fixtureInstanceId("feedback75-return")) &&
          s.players[0]!.battleArea.find((p) => p.permanentId === GLOWING)?.currentDP === (accept ? 7000 : 4000) &&
          s.players[0]!.battleArea.find((p) => p.permanentId === TOMORO)?.isSuspended === accept,
        (decision) => {
          if (decision.kind === "optional" && decision.sourceCardId === "ST23-13") {
            ownBuffOffers++;
            return { accept };
          }
          if (decision.options.candidateInstanceIds?.includes(TOMORO)) return { instanceId: TOMORO };
          if (decision.options.candidateInstanceIds?.includes(GLOWING)) return { instanceId: GLOWING };
          if (decision.options.candidateInstanceIds?.includes(fixtureInstanceId("feedback75-return")))
            return { instanceId: fixtureInstanceId("feedback75-return") };
          return {};
        },
      );
      expect(ownBuffOffers).toBe(1);
      const own = await scenario.snapshot();
      expect(own.memory).toBe(1);
      expect(own.players[0]!.battleArea.find((p) => p.permanentId === GLOWING)!.currentDP).toBe(accept ? 7000 : 4000);
      expect(
        own.players[0]!.battleArea.find((p) => p.permanentId === TOMORO)!.stack.map((card) => card.instanceId),
      ).toEqual([fixtureInstanceId("dev-stack-0-feedback75-tomoro-1")]);
      expect(own.players[0]!.trash.map((card) => card.instanceId)).toEqual([
        fixtureInstanceId("dev-stack-0-feedback75-tomoro-0"),
      ]);
      await scenario.healthy();
      await page.getByRole("button", { name: /^end turn$/i }).click();
      // The autonomous bot waits for the prior phase presentation before declaring
      // its scripted attack. This arrival wait does not relax decision visibility.
      await expect
        .poll(async () => (await scenario.presentation()).decisions.some((d) => d.sourceCardId === "BT26-003"), {
          timeout: 40_000,
        })
        .toBe(true);
      let opponentBuffOffers = 0;
      await scenario.resolveUntil(
        (s) => s.turnSeat === 0 && s.phase === "Breeding" && !s.pendingDecision,
        (decision) => {
          if (decision.kind === "optional" && decision.sourceCardId === "ST23-13") opponentBuffOffers++;
          if (decision.options.candidateInstanceIds?.includes(TOMORO)) return { instanceId: TOMORO };
          if (decision.options.candidateInstanceIds?.includes(GLOWING)) return { instanceId: GLOWING };
          return {};
        },
      );
      expect(opponentBuffOffers).toBe(0);
      const after = await scenario.snapshot();
      expect(after.players[0]!.battleArea.find((p) => p.permanentId === TOMORO)!.stack).toHaveLength(0);
      expect(after.players[0]!.battleArea.find((p) => p.permanentId === TOMORO)!.isSuspended).toBe(false);
      expect(after.players[0]!.battleArea.find((p) => p.permanentId === GLOWING)!.currentDP).toBe(4000);
      expect(after.players[1]!.trash.map((card) => card.instanceId)).toContain(
        fixtureInstanceId("dev-field-1-feedback75-attacker"),
      );
      expect(after.players[0]!.trash.map((card) => card.instanceId)).toEqual([
        fixtureInstanceId("dev-stack-0-feedback75-tomoro-0"),
        fixtureInstanceId("dev-stack-0-feedback75-tomoro-1"),
      ]);
      expect(after.players[0]!.securityCount).toBe(3);
      expect(after.memory).toBe(3);
      await scenario.healthy();
    });
  }
});
