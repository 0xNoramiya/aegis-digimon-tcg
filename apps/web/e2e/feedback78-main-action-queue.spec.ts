import prepared0 from "../../api/src/engine/scenarios/main-positive.fixture";
import prepared1 from "../../api/src/engine/scenarios/main-crossed.fixture";
import { fixtureVariant, fixtureInstanceId } from "../../api/src/engine/scenario/references";

const preparedFixtures = { "main-positive": prepared0, "main-crossed": prepared1 };

import { test, expect } from "./scenario-page";

for (const positive of [false, true]) {
  test(`Feedback #78: ${positive ? "a fresh play after the search settles" : "crossed-memory search passes without a second play"}`, async ({
    scenario,
    page,
  }) => {
    await page.setViewportSize({ width: positive ? 1440 : 390, height: positive ? 1000 : 844 });
    await page.addInitScript((dark) => localStorage.setItem("aegis:darkMode", String(dark)), !positive);
    await scenario.openFixture(fixtureVariant(preparedFixtures, positive ? "main-positive" : "main-crossed"));
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const before = await scenario.snapshot();
    await scenario.play("Candlemon", "Digimon");
    let orders = 0;
    await scenario.resolveUntil(
      (s) =>
        orders === 1 &&
        !s.pendingDecision &&
        (positive ? s.turnSeat === 0 && s.memory === 5 : s.turnSeat === 1 && s.phase === "Breeding" && s.memory === 3),
      (decision) => {
        expect(decision.kind).toBe("orderCards");
        expect(decision.sourceCardId).toBe("BT18-030");
        expect(decision.options?.candidateInstanceIds).toEqual([
          fixtureInstanceId("feedback78-deck-0-1"),
          fixtureInstanceId("feedback78-deck-0-2"),
          fixtureInstanceId("feedback78-deck-0-3"),
        ]);
        orders++;
        return {};
      },
    );
    const searched = await scenario.snapshot();
    expect(searched.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([
      fixtureInstanceId("feedback78-candle"),
    ]);
    expect(searched.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      before.players[0]!.hand.filter((card) => card.instanceId !== fixtureInstanceId("feedback78-candle")).map(
        (card) => card.instanceId,
      ),
    );
    expect(searched.players[0]!.deckCount).toBe(before.players[0]!.deckCount);
    if (positive) {
      await scenario.play("Wizardmon", "Digimon");
      await scenario.resolveUntil(
        (s) =>
          !s.pendingDecision &&
          s.memory === 0 &&
          s.players[0]!.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("feedback78-wizard")),
      );
      await page.getByRole("button", { name: /^end turn$/i }).click();
      await scenario.resolveUntil(
        (s) => s.turnSeat === 1 && s.phase === "Breeding" && s.memory === 3 && !s.pendingDecision,
      );
    } else {
      await scenario.hand("Wizardmon");
      await expect(page.getByRole("button", { name: "Play Digimon", exact: true })).toHaveCount(0);
    }
    const after = await scenario.snapshot();
    expect(after.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual(
      positive
        ? [fixtureInstanceId("feedback78-candle"), fixtureInstanceId("feedback78-wizard")]
        : [fixtureInstanceId("feedback78-candle")],
    );
    expect(after.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      before.players[0]!.hand.filter(
        (card) =>
          card.instanceId !== fixtureInstanceId("feedback78-candle") &&
          (!positive || card.instanceId !== fixtureInstanceId("feedback78-wizard")),
      ).map((card) => card.instanceId),
    );
    expect(after.players[0]!.securityCount).toBe(3);
    expect(after.players[0]!.trash).toHaveLength(0);
    const events = (await scenario.presentation()).events;
    expect(
      events.flatMap((event) =>
        event.kind === "memoryChanged" && event.reason === "payCost" ? [[event.from, event.to]] : [],
      ),
    ).toEqual(
      positive
        ? [
            [8, 5],
            [5, 0],
          ]
        : [[0, -3]],
    );
    expect(
      events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT18-036"),
    ).toHaveLength(0);
    expect(
      events.flatMap((event) => (event.kind === "cardsMoved" && event.to === "deckBottom" ? event.instanceIds : [])),
    ).toEqual([
      fixtureInstanceId("feedback78-deck-0-1"),
      fixtureInstanceId("feedback78-deck-0-2"),
      fixtureInstanceId("feedback78-deck-0-3"),
    ]);
    await scenario.healthy();
  });
}
