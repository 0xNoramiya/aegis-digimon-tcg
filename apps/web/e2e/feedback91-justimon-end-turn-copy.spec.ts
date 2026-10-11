import prepared0 from "../../api/src/engine/scenarios/justimon-end-turn-copy.fixture";
import { fixtureVariant, fixtureInstanceId, fixturePermanentId } from "../../api/src/engine/scenario/references";

const preparedFixtures = { "justimon-end-turn-copy": prepared0 };

import { test, expect, type DecisionPolicy } from "./scenario-page";

test.use({ holdBotAfterTurn: 1 });

for (const mode of ["accept", "refuse", "declineEgg"] as const) {
  test(`Feedback #91: ${mode} resolves End of Turn copying after both lenders were used`, async ({
    scenario,
    page,
  }) => {
    // Two ordinary attacks, two evolutions and one end-of-turn attack have separate
    // presentation queues; each visible decision retains the normal six-second budget.
    test.setTimeout(180_000);
    await page.setViewportSize({ width: mode === "accept" ? 390 : 1440, height: mode === "accept" ? 844 : 1000 });
    await page.addInitScript((dark) => localStorage.setItem("aegis:darkMode", String(dark)), mode !== "refuse");
    await scenario.openFixture(fixtureVariant(preparedFixtures, "justimon-end-turn-copy"));
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    expect((await scenario.snapshot()).memory).toBe(6);
    const hostId = fixturePermanentId("dev-perm-0-feedback91-host");
    const victimId = fixturePermanentId("dev-perm-1-feedback91-victim");
    const first = fixtureInstanceId("dev-field-0-feedback91-first");
    const second = fixtureInstanceId("dev-field-0-feedback91-second");
    const third = fixtureInstanceId("dev-field-0-feedback91-third");
    let stage: "blitz" | "accel" | "x" | "end" = "blitz";
    let copyOffers = 0;
    const policy: DecisionPolicy = (decision) => {
      const candidates = decision.options.candidateInstanceIds ?? [];
      if (decision.kind === "orderTriggers" && decision.options.triggerKeys?.some((key) => key.includes("EX13-006")))
        return { triggerCardId: "EX13-006" };
      if (stage === "end" && mode === "declineEgg" && /paying 1 cost/i.test(decision.promptText))
        return { accept: false };
      if (stage === "end" && mode === "refuse" && /by trashing 1 Option card/i.test(decision.promptText))
        return { accept: false };
      if (decision.sourceCardId === "EX8-054" && candidates.includes(fixtureInstanceId("feedback91-accel"))) {
        expect(candidates).toEqual([
          fixtureInstanceId("dev-field-0-feedback91-host"),
          fixtureInstanceId("feedback91-accel"),
        ]);
        copyOffers++;
        return { instanceId: fixtureInstanceId("feedback91-accel") };
      }
      const option = stage === "blitz" ? first : stage === "accel" ? second : third;
      if (candidates.includes(option)) return { instanceId: option };
      const target = stage === "blitz" ? fixturePermanentId("dev-perm-1-feedback91-bait") : victimId;
      if (candidates.includes(target)) return { instanceId: target };
      return {};
    };
    await scenario.attack(hostId);
    await scenario.resolveUntil(
      (s) => !s.pendingDecision && !s.combatWindow && s.players[1]!.securityCount === 8,
      policy,
    );
    expect((await scenario.snapshot()).players[0]!.battleArea.find((p) => p.permanentId === hostId)!.isSuspended).toBe(
      false,
    );
    stage = "accel";
    await scenario.evolve("Justimon: Accel Arm", hostId);
    await scenario.resolveUntil(
      (s) => !s.pendingDecision && s.memory === 5 && s.players[0]!.trash.some((c) => c.instanceId === second),
      policy,
    );
    await scenario.attack(hostId);
    await scenario.resolveUntil(
      (s) => !s.pendingDecision && !s.combatWindow && s.players[1]!.securityCount === 6,
      policy,
    );
    stage = "x";
    await scenario.evolve("Justimon (X Antibody)", hostId);
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        s.memory === 4 &&
        s.players[0]!.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("feedback91-x")),
      policy,
    );
    stage = "end";
    await page.getByRole("button", { name: /^end turn$/i }).click();
    await scenario.resolveUntil((s) => s.turnSeat === 1 && s.phase === "Breeding" && !s.pendingDecision, policy);
    const after = await scenario.snapshot();
    const own = after.players[0]!;
    const host = own.battleArea.find((p) => p.permanentId === hostId)!;
    expect(host.topCard.instanceId).toBe(fixtureInstanceId("feedback91-x"));
    expect(host.stack.map((c) => c.instanceId)).toEqual([
      fixtureInstanceId("dev-stack-0-feedback91-host-0"),
      fixtureInstanceId("dev-field-0-feedback91-host"),
      fixtureInstanceId("feedback91-accel"),
    ]);
    expect(host.isSuspended).toBe(true);
    expect(own.hand.map((c) => c.instanceId)).toEqual([
      fixtureInstanceId("feedback91-deck-0-0"),
      fixtureInstanceId("feedback91-deck-0-1"),
      fixtureInstanceId("feedback91-deck-0-2"),
    ]);
    expect(own.deckCount).toBe(17);
    expect(own.trash.map((c) => c.instanceId)).toEqual(mode === "accept" ? [first, second, third] : [first, second]);
    expect(own.battleArea.some((p) => p.topCard.instanceId === third)).toBe(mode !== "accept");
    expect(after.memory).toBe(mode === "declineEgg" ? 3 : 4);
    expect(after.players[1]!.securityCount).toBe(mode === "accept" ? 2 : mode === "refuse" ? 3 : 6);
    expect(after.players[1]!.battleArea.find((p) => p.permanentId === victimId)!.topCard.cardId).toBe(
      mode === "declineEgg" ? "BT1-073" : "BT1-066",
    );
    expect(copyOffers).toBe(mode === "declineEgg" ? 0 : 1);
    const events = (await scenario.presentation()).events;
    expect(events.filter((e) => e.kind === "attackEnded")).toHaveLength(mode === "declineEgg" ? 2 : 3);
    expect(
      events.flatMap((e) => (e.kind === "memoryChanged" && e.reason === "payCost" ? [[e.from, e.to]] : [])),
    ).toEqual([
      [6, 5],
      [5, 4],
    ]);
    expect(
      events.flatMap((e) => (e.kind === "memoryChanged" && e.reason === "gainMemory" ? [[e.from, e.to]] : [])),
    ).toEqual(mode === "declineEgg" ? [] : [[-3, -4]]);
    await scenario.healthy();
  });
}
