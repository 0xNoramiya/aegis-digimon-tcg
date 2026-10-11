import fixtureBt20OuryukenBlastDnaCounter from "../../api/src/engine/scenarios/bt20-ouryuken-blast-dna-counter.fixture";
import { fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { RED_DECK } from "../../api/dist/engine/testDecks.js";
import { test, expect } from "./fixtures";
import { answerActivation } from "./scenario-page";
import { GamePage } from "./game-page";

type CardSnapshot = { instanceId: string; cardId: string };
type Snapshot = {
  players: {
    hand: CardSnapshot[];
    battleArea: { topCard: CardSnapshot; stack: CardSnapshot[] }[];
    securityCount: number;
  }[];
  combatWindow?: { kind: string };
  pendingDecision?: { kind: string };
};

for (const width of [320, 390, 768, 1024, 1440]) {
  test.describe(`Ouryuken Counter at ${width}px`, () => {
    test.use({ viewport: { width, height: 1000 } });

    test("activates Blast DNA from the rail with duplicate hand copies", async ({ page, match }) => {
      match.server.useFixture(fixtureBt20OuryukenBlastDnaCounter);
      await page.addInitScript(
        (options) => {
          localStorage.setItem("aegis:locale", "en");
          localStorage.setItem("aegis.skip-end-turn-confirmation", "true");
          window.browserTestOptions = options;
        },
        {
          displayName: "zeroxbass",
          deck: { mainDeck: [...RED_DECK.mainDeck], eggDeck: [...RED_DECK.eggDeck] },
          seed: 1,
          devScenario: "local-fixture" as const,
        },
      );
      await page.goto("/e2e/harness.html");
      const game = new GamePage(page);
      await game.endBreeding();
      await page.getByRole("button", { name: /^end turn$/i }).click();
      await answerActivation(page, false, "Alphamon");
      await answerActivation(page, false, /When one of your opponent's Digimon attacks/);
      const counter = page.getByRole("region", { name: "Counter timing", exact: true });
      await expect(counter).toBeVisible();
      const secondAce = page.locator(`[data-hand-instance-id="${fixtureInstanceId("ouryuken-ace-2-card")}"]`);
      await secondAce.focus();
      await secondAce.press("Enter");
      const rail = page.getByRole("dialog", { name: "Counter timing" });
      await expect(rail).toBeVisible();
      const blast = rail.getByRole("button", { name: /Blast DNA/ });
      await expect(blast).toHaveCount(1);
      await expect(blast).toBeVisible();
      const screenshotPath = test.info().outputPath("counter-rail.png");
      await page.screenshot({ path: screenshotPath });
      await test.info().attach("counter-rail", { path: screenshotPath, contentType: "image/png" });
      await blast.click();
      await expect(rail).toHaveCount(0);
      await expect
        .poll(async () => {
          const state = (await match.snapshot()) as Snapshot;
          return state.players[0]!.battleArea.some(
            ({ topCard }) => topCard.instanceId === fixtureInstanceId("ouryuken-ace-2-card"),
          );
        })
        .toBe(true);
      await expect
        .poll(async () => {
          const state = (await match.snapshot()) as Snapshot;
          return {
            attackerCount: state.players[1]!.battleArea.length,
            ownSecurity: state.players[0]!.securityCount,
            botSecurity: state.players[1]!.securityCount,
            pending: state.pendingDecision?.kind,
            window: state.combatWindow?.kind,
          };
        })
        .toEqual({ attackerCount: 0, ownSecurity: 6, botSecurity: 4, pending: undefined, window: undefined });
      const final = (await match.snapshot()) as Snapshot;
      const hand = final.players[0]!.hand.map(({ instanceId }) => instanceId);
      expect(hand).toContain(fixtureInstanceId("ouryuken-ace-1-card"));
      expect(hand).toContain(fixtureInstanceId("ouryuken-partner-2-card"));
      expect(hand).not.toContain(fixtureInstanceId("ouryuken-ace-2-card"));
      expect(hand).not.toContain(fixtureInstanceId("ouryuken-partner-1-card"));
      const result = final.players[0]!.battleArea.find(
        ({ topCard }) => topCard.instanceId === fixtureInstanceId("ouryuken-ace-2-card"),
      )!;
      expect(result.stack[0]!.instanceId).toBe(fixtureInstanceId("ouryuken-partner-1-card"));
    });
  });
}
