import prepared0 from "../../api/src/engine/scenarios/savior-option-cost.fixture";
import { fixtureVariant, fixtureInstanceId, fixturePermanentId } from "../../api/src/engine/scenario/references";

const preparedFixtures = { "savior-option-cost": prepared0 };

import { test, expect, type DecisionPolicy } from "./scenario-page";

test.use({ holdBotAfterTurn: 1 });

for (const mode of ["arts", "declineArts", "refuse"] as const) {
  test(`Feedback #80: ${mode} preserves the discounted Option payment and full resolution`, async ({
    scenario,
    page,
  }) => {
    await page.setViewportSize({ width: mode === "arts" ? 390 : 1440, height: mode === "arts" ? 844 : 1000 });
    await page.addInitScript((dark) => localStorage.setItem("aegis:darkMode", String(dark)), mode !== "declineArts");
    await scenario.openFixture(fixtureVariant(preparedFixtures, "savior-option-cost"));
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    expect((await scenario.snapshot()).memory).toBe(0);
    if (process.env.AEGIS_E2E_PRODUCTION === "true") {
      await expect(page.locator("style[data-vite-dev-id]")).toHaveCount(0);
      expect(await page.locator('link[rel="stylesheet"][href*="/assets/"]').count()).toBeGreaterThan(0);
    }
    let optionOffers = 0;
    let artsOffers = 0;
    const policy: DecisionPolicy = (decision) => {
      const candidates = decision.options.candidateInstanceIds ?? [];
      if (decision.promptText.includes("Arts Digivolve")) {
        artsOffers++;
        return mode === "declineArts" ? { accept: false } : { instanceId: fixtureInstanceId("feedback80-blanc") };
      }
      if (decision.sourceCardId === "EX13-012" && candidates.includes(fixtureInstanceId("feedback80-option"))) {
        optionOffers++;
        expect(candidates).toEqual([fixtureInstanceId("feedback80-option")]);
        return mode === "refuse" ? { accept: false } : { instanceId: fixtureInstanceId("feedback80-option") };
      }
      if (candidates.includes(fixtureInstanceId("feedback80-blanc")))
        return { instanceId: fixtureInstanceId("feedback80-blanc") };
      if (candidates.includes(fixturePermanentId("dev-perm-1-feedback80-target")))
        return { instanceId: fixturePermanentId("dev-perm-1-feedback80-target") };
      return {};
    };
    await scenario.evolve("SaviorHuckmon", fixturePermanentId("dev-perm-0-feedback80-host"));
    await scenario.resolveUntil(
      (s) =>
        optionOffers === 1 &&
        s.turnSeat === 1 &&
        s.phase === "Breeding" &&
        s.memory === (mode === "refuse" ? 3 : 4) &&
        !s.pendingDecision,
      policy,
    );
    await scenario.idle();
    const after = await scenario.snapshot();
    const own = after.players[0]!;
    const host = own.battleArea.find((p) => p.permanentId === fixturePermanentId("dev-perm-0-feedback80-host"))!;
    expect(host.topCard.instanceId).toBe(fixtureInstanceId("feedback80-savior"));
    expect(host.stack.map((c) => c.instanceId)).toEqual([
      fixtureInstanceId("feedback80-huckmon"),
      fixtureInstanceId("feedback80-base"),
    ]);
    expect(artsOffers).toBe(mode === "refuse" ? 0 : 1);
    expect(own.battleArea.map((p) => p.topCard.instanceId)).toEqual(
      mode === "refuse"
        ? [fixtureInstanceId("feedback80-savior")]
        : [
            fixtureInstanceId("feedback80-savior"),
            mode === "arts" ? fixtureInstanceId("feedback80-option") : fixtureInstanceId("feedback80-blanc"),
          ],
    );
    expect(own.trash.map((c) => c.instanceId)).toEqual(
      mode === "refuse"
        ? [fixtureInstanceId("feedback80-blanc")]
        : mode === "arts"
          ? []
          : [fixtureInstanceId("feedback80-option")],
    );
    expect(own.hand.map((c) => c.instanceId)).toEqual(
      mode === "refuse"
        ? [
            fixtureInstanceId("feedback80-reserve-0"),
            fixtureInstanceId("feedback80-option"),
            fixtureInstanceId("feedback80-deck-0-0"),
            fixtureInstanceId("feedback80-deck-0-1"),
          ]
        : mode === "arts"
          ? [
              fixtureInstanceId("feedback80-reserve-0"),
              fixtureInstanceId("feedback80-deck-0-0"),
              fixtureInstanceId("feedback80-deck-0-1"),
              fixtureInstanceId("feedback80-deck-0-2"),
            ]
          : [
              fixtureInstanceId("feedback80-reserve-0"),
              fixtureInstanceId("feedback80-deck-0-0"),
              fixtureInstanceId("feedback80-deck-0-1"),
              fixtureInstanceId("feedback80-security-0-0"),
            ],
    );
    expect(own.deckCount).toBe(mode === "refuse" ? 10 : 9);
    expect(own.securityCount).toBe(3);
    expect(after.players[1]!.battleArea[0]!.currentDP).toBe(20_000);
    const events = (await scenario.presentation()).events;
    expect(
      events.flatMap((e) => (e.kind === "memoryChanged" && e.reason === "payCost" ? [[e.from, e.to]] : [])),
    ).toEqual([[0, -3]]);
    expect(
      events.flatMap((e) => (e.kind === "memoryChanged" && e.reason === "useOption" ? [[e.from, e.to]] : [])),
    ).toEqual(mode === "refuse" ? [] : [[-3, -5]]);
    expect(
      events.flatMap((e) => (e.kind === "memoryChanged" && e.reason === "gainMemory" ? [[e.from, e.to]] : [])),
    ).toEqual(mode === "refuse" ? [] : [[-5, -4]]);
    expect(events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT23-076")).toHaveLength(
      mode === "declineArts" ? 1 : 0,
    );
    const arts = events.filter((e) => e.kind === "digivolved" && e.cardId === "EX13-065");
    expect(arts).toHaveLength(mode === "arts" ? 1 : 0);
    if (mode === "arts") {
      const blanc = events.find((e) => e.kind === "cardPlayed" && e.cardId === "BT23-076");
      expect(arts[0]).toMatchObject({ permanentId: blanc && "permanentId" in blanc ? blanc.permanentId : undefined });
      expect(own.battleArea[1]!.stack.map((c) => c.instanceId)).toEqual([fixtureInstanceId("feedback80-blanc")]);
    }
    if (mode !== "refuse") {
      const paid = events.findIndex((e) => e.kind === "memoryChanged" && e.reason === "useOption");
      const main = events.findIndex(
        (e) => e.kind === "effectResolved" && e.sourceCardId === "EX13-065" && e.timing === "OnUseOption",
      );
      const savior = events.findIndex(
        (e) => e.kind === "effectResolved" && e.sourceCardId === "EX13-012" && e.timing === "WhenDigivolving",
      );
      const gained = events.findIndex((e) => e.kind === "memoryChanged" && e.reason === "gainMemory");
      const ended = events.findIndex((e) => e.kind === "turnEnded");
      expect(paid).toBeGreaterThanOrEqual(0);
      expect(main).toBeGreaterThan(paid);
      expect(savior).toBeGreaterThan(main);
      expect(gained).toBeGreaterThan(savior);
      expect(ended).toBeGreaterThan(gained);
    }
    await scenario.healthy();
  });
}
