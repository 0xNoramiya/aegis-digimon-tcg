import fixtureSecurityLeakKnownCardFaceDown from "../../api/src/engine/scenarios/security-leak-known-card-face-down.fixture";
import { fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { getCardDefinition } from "@aegis/shared";
import { test, expect } from "./scenario-page";

const MONODRAMON = fixtureInstanceId("opponent-card-security-leak-monodramon-card");
const ADISTAKTO = fixtureInstanceId("security-leak-adistakto-card");
const FACE_UP_SECURITY = fixtureInstanceId("security-leak-security-1-face-up-card");

declare global {
  interface Window {
    securityLeakSightings?: string[];
  }
}

// Hidden information: the bot's security already shows Agumon face up, so this client holds part
// of that stack. Lónkhē Adistakto places the bot's Monodramon, which this client saw on the field,
// face down on top of it. This client's state must never hold Monodramon's identity there.
test("a known card placed face down into security never reaches the opponent's client", async ({ scenario, page }) => {
  await scenario.openFixture(fixtureSecurityLeakKnownCardFaceDown);
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  const before = await scenario.snapshot();
  expect(before.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([MONODRAMON]);
  expect(before.players[1]!.securityView[1]).toMatchObject({
    instanceId: FACE_UP_SECURITY,
    cardId: "BT1-010",
    faceUp: true,
  });

  // Record every face-down security card this client ever holds with an identity, frame by frame,
  // so a leak that a later patch hides again still fails the test.
  await page.evaluate(() => {
    window.securityLeakSightings = [];
    const watch = () => {
      for (const player of window.browserTestSnapshot().players) {
        for (const card of player.security ?? []) {
          if (!card.faceUp && (card.cardId || card.artId)) window.securityLeakSightings!.push(card.instanceId);
        }
        for (const card of player.securityView ?? []) {
          if (!card.faceUp && (card.instanceId || card.cardId || card.artId))
            window.securityLeakSightings!.push(`projection:${card.instanceId}`);
        }
      }
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  });

  await scenario.play(getCardDefinition("BT10-101")!.nameEn, "Option");
  await scenario.resolveUntil(
    (s) =>
      s.players[1]!.battleArea.length === 0 &&
      s.players[1]!.securityCount === 4 &&
      s.players[0]!.trash.some((card) => card.instanceId === ADISTAKTO) &&
      !s.pendingDecision,
    () => ({ instanceId: MONODRAMON }),
  );

  const after = await scenario.snapshot();
  const bot = after.players[1]!;
  expect(await page.evaluate(() => window.securityLeakSightings)).toEqual([]);
  // The raw security array is the owner's alone; this client reads the stack from `securityView`.
  expect(bot.security ?? []).toEqual([]);
  expect(JSON.stringify(bot)).not.toContain(MONODRAMON);
  expect(bot.securityView.map((card) => [card.instanceId, card.cardId, card.faceUp])).toEqual([
    ["", "", false],
    ["", "", false],
    [FACE_UP_SECURITY, "BT1-010", true],
    ["", "", false],
  ]);
  expect(bot.trash.some((card) => card.instanceId === MONODRAMON)).toBe(false);
  await scenario.healthy();
});
