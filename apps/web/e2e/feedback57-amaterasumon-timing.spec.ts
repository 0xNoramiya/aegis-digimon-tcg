import prepared0 from "../../api/src/engine/scenarios/amaterasumon-empty-resolution.fixture";
import prepared1 from "../../api/src/engine/scenarios/amaterasumon-paid-resolution.fixture";
import { fixtureVariant, fixtureInstanceId, fixturePermanentId } from "../../api/src/engine/scenario/references";

import { test, expect } from "./scenario-page";

const preparedFixtures = { "amaterasumon-empty-resolution": prepared0, "amaterasumon-paid-resolution": prepared1 };

const ATTACKER = fixturePermanentId("dev-perm-0-feedback57-attacker");
const LOWEST = fixturePermanentId("dev-perm-1-feedback57-lowest");
const TARGET = fixturePermanentId("dev-perm-1-feedback57-target");
const PAYMENT = [fixtureInstanceId("feedback57-return-red"), fixtureInstanceId("feedback57-return-blue")];

test.use({ holdBotAfterTurn: 1 });

for (const mode of ["empty", "pay", "decline"] as const) {
  test(`Feedback #57: Amaterasumon's ${mode} resolution precedes the second security check`, async ({ scenario }) => {
    const paid = mode === "pay";
    await scenario.openFixture(
      fixtureVariant(
        preparedFixtures,
        mode === "empty" ? "amaterasumon-empty-resolution" : "amaterasumon-paid-resolution",
      ),
    );
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const before = await scenario.snapshot();
    const source = before.players[0]!.battleArea.find((p) => p.permanentId === ATTACKER)!;
    const sourceIds = [source.topCard.instanceId, ...source.stack.map((c) => c.instanceId)];
    let paymentChoices = 0;
    await scenario.attack(ATTACKER);
    await scenario.resolveUntil(
      (s) => s.turnSeat === 1 && s.phase === "Breeding" && !s.pendingDecision && !s.combatWindow,
      async (decision) => {
        if (decision.options.purpose === "optionalTarget" && decision.options.min === 0) return { accept: false };
        if (decision.options.digivolveCostChoice) {
          expect(decision.options.digivolveCostChoice.costs).toEqual([4, 3]);
          expect(decision.options.digivolveCostChoice.costDelta).toBe(-2);
          return { choice: 1 };
        }
        if (decision.kind === "orderTriggers") {
          expect(decision.options.triggerKeys).toEqual([
            `ascension/${fixtureInstanceId("feedback57-amaterasu")}`,
            `on-deletion/${fixtureInstanceId("feedback57-amaterasu")}`,
          ]);
          expect(decision.options.acceptsResolutionPlan).toBe(true);
          expect(decision.options.triggerCardIds).toEqual(["EX12-047", "EX12-047"]);
          await expect(scenario.page.getByRole("list", { name: "Order pending effects" })).toBeVisible();
          await expect(
            scenario.page.getByRole("dialog").getByRole("button", { name: "Select all, top to bottom" }),
          ).toBeVisible();
          await scenario.page
            .getByRole("dialog")
            .locator(".trigger-chooser__entry")
            .first()
            .getByRole("button", { name: "No", exact: true })
            .click();
          // This receipt precedes the earlier clause, second security battle and
          // deletion presentation: the healthy sequence measured 8.03 seconds.
          return { decisionBudgetMs: 10_000 };
        }
        if (/Ascension/.test(decision.promptText) || decision.options.timing === "OnDeletion") return { accept: false };
        const candidates = decision.options.candidateInstanceIds ?? [];
        if (candidates.includes(fixtureInstanceId("feedback57-amaterasu")))
          return { instanceId: fixtureInstanceId("feedback57-amaterasu") };
        if (candidates.includes(PAYMENT[0]!)) {
          expect(paid).toBe(true);
          expect(candidates).toEqual(expect.arrayContaining(PAYMENT));
          return { instanceIds: PAYMENT };
        }
        if (candidates.includes(LOWEST)) return { instanceId: LOWEST };
        if (candidates.includes(TARGET)) return { instanceId: TARGET };
        if (decision.kind === "optional") {
          if (decision.sourceCardId === "EX12-047" && /returning 2/.test(decision.promptText)) {
            paymentChoices++;
            expect(mode).not.toBe("empty");
            return { accept: paid };
          }
          return {
            accept:
              decision.sourceCardId === "EX12-046" &&
              /digivolv/i.test(`${decision.promptText} ${decision.options.effectText ?? ""}`),
          };
        }
        return {};
      },
    );
    const final = await scenario.snapshot();
    expect(paymentChoices).toBe(mode === "empty" ? 0 : 1);
    expect(final.turnSeat).toBe(1);
    expect(final.turnCount).toBe(before.turnCount + 1);
    expect(final.memory).toBe(1);
    expect(final.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 1);
    expect(final.players[0]!.hand).toHaveLength(before.players[0]!.hand.length);
    expect(final.players[1]!.securityCount).toBe(before.players[1]!.securityCount - 2);
    expect(
      final.players[1]!.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("feedback57-parkour")),
    ).toBe(true);
    expect(final.players[1]!.trash.map((c) => c.instanceId)).not.toContain(fixtureInstanceId("feedback57-parkour"));
    expect(final.players[1]!.breeding?.topCard.cardId).toBe("EX5-015");
    if (paid) {
      const survivor = final.players[0]!.battleArea.find((p) => p.permanentId === ATTACKER)!;
      expect(survivor.topCard.instanceId).toBe(fixtureInstanceId("feedback57-amaterasu"));
      expect(survivor.stack.map((c) => c.instanceId)).toEqual([sourceIds[1], sourceIds[0]]);
      expect(survivor.isSuspended).toBe(true);
      expect(final.players[0]!.trash).toHaveLength(0);
    } else {
      expect(final.players[0]!.battleArea).toHaveLength(0);
      expect(final.players[0]!.trash.map((c) => c.instanceId)).toEqual(
        expect.arrayContaining([...sourceIds, fixtureInstanceId("feedback57-amaterasu")]),
      );
    }
    if (mode !== "empty") {
      expect(final.players[1]!.battleArea.some((p) => p.permanentId === LOWEST)).toBe(false);
      expect(final.players[1]!.battleArea.find((p) => p.permanentId === TARGET)!.currentDP).toBe(20000);
      for (const id of PAYMENT) expect(final.players[1]!.trash.some((c) => c.instanceId === id)).toBe(!paid);
    }
    const { events } = await scenario.presentation();
    const resolution = events.find(
      (e) => e.kind === "effectResolved" && e.sourceCardId === "EX12-047" && e.timing === "WhenDigivolving",
    );
    const firstCheck = events.find((e) => e.kind === "securityChecked" && e.revealedCardId === "LM-058");
    const secondReveal = events.find((e) => e.kind === "securityRevealed" && e.revealedCardId === "EX12-035");
    expect(resolution).toBeDefined();
    expect(firstCheck!.seq).toBeGreaterThan(resolution!.seq);
    expect(secondReveal!.seq).toBeGreaterThan(firstCheck!.seq);
    expect(events.find((e) => e.kind === "securityChecked" && e.revealedCardId === "EX12-035")).toMatchObject({
      battle: { attackerDP: paid ? 18000 : 12000, securityCardDP: 12000, attackerDeleted: !paid },
    });
    if (paid) {
      const returned = events.find(
        (e) => e.kind === "cardsMoved" && e.to === "deckBottom" && PAYMENT.every((id) => e.instanceIds.includes(id)),
      );
      expect(returned).toBeDefined();
      expect(returned!.seq).toBeLessThan(resolution!.seq);
    }
    await scenario.healthy();
  });
}
