import fixture from "../../api/src/engine/scenarios/galacticmon-immunity-loses-examon-battle.fixture";
import { test, expect } from "./scenario-page";

for (const viewport of [
  { width: 1440, height: 1000, dark: false },
  { width: 390, height: 844, dark: true },
]) {
  test(`Examon battles the effect-immune Galacticmon and deletes it at ${viewport.width}px`, async ({
    scenario,
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript((dark) => localStorage.setItem("aegis:darkMode", String(dark)), viewport.dark);
    const refs = await scenario.openFixture(
      {
        ...fixture,
        presentation: {
          holdBotAfterTurn: 4,
          opponent: {
            endBreeding: true,
            fallbackMain: "end",
            main: [{ kind: "digivolve", card: "EX11-046", base: "BT11-065", alternate: true }],
          },
        },
      },
      "normal",
      "none",
    );
    const galacticmonId = refs.permanentId("snatchmon");

    await expect(page.getByRole("button", { name: /^end breeding$/i })).toBeEnabled({ timeout: 30_000 });
    const before = await scenario.snapshot();
    const galacticmon = before.players[1]!.battleArea.find((perm) => perm.permanentId === galacticmonId)!;
    expect(galacticmon.topCard.instanceId).toBe(refs.instanceId("galacticmon"));
    expect(galacticmon.immuneToOpponentDigimonEffects && galacticmon.immuneToOpponentOptionEffects).toBe(true);

    const breeding = page.locator('[data-drop="breeding-you"]');
    await breeding.focus();
    await breeding.press("Enter");
    await scenario.resolveUntil((state) => state.phase === "Main" && state.players[0]!.battleArea.length === 2);

    await scenario.hand("Examon");
    await page.getByRole("button", { name: "Digivolve", exact: true }).click();
    for (const alias of ["greenMaterial", "blueMaterial"]) {
      const card = page.locator(`[data-id="${refs.permanentId(alias)}"][role="button"]`);
      if (!(await card.locator(".game-permanent__material-order").count())) {
        await card.focus();
        await card.press("Enter");
      }
    }
    await page
      .getByRole("region", { name: /DNA Digivolution available/i })
      .getByRole("button", { name: "DNA Digivolve", exact: true })
      .click();

    const prompted: string[] = [];
    await scenario.resolveUntil(
      (state) => state.players[1]!.battleArea.length === 0 && !state.pendingDecision && !state.combatWindow,
      (decision) => {
        prompted.push(`${decision.kind}:${decision.promptText}`);
        return { accept: true };
      },
    );
    expect(prompted.some((entry) => entry.startsWith("optional:") && entry.includes("battle"))).toBe(true);

    const after = await scenario.snapshot();
    expect(after.players[1]!.trash.map((card) => card.instanceId)).toContain(refs.instanceId("galacticmon"));
    const events = (await scenario.presentation()).events;
    expect(
      events.some(
        (event) =>
          event.kind === "battleCompared" &&
          event.effectBattle?.attackerCardId === "EX13-045" &&
          event.loserPermanentIds.includes(galacticmonId),
      ),
    ).toBe(true);
    expect(events.some((event) => event.kind === "attackDeclared" && event.redirected)).toBe(false);
    await scenario.healthy();
  });
}
