import fixtureShoutmonTrashBt12 from "../../api/src/engine/scenarios/shoutmon-trash-bt12.fixture";
import fixtureShoutmonTrashBt21 from "../../api/src/engine/scenarios/shoutmon-trash-bt21.fixture";
import { fixtureVariant, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { getCardDefinition } from "@aegis/shared";
import { test, expect } from "./scenario-page";

for (const set of ["bt21", "bt12"]) {
  test(`${set}: paid Shoutmon clause precedes trash and former-source DigiXros selection`, async ({
    scenario,
    page,
  }) => {
    await scenario.openFixture(fixtureVariant({ bt21: fixtureShoutmonTrashBt21, bt12: fixtureShoutmonTrashBt12 }, set));
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const before = await scenario.snapshot();
    const shoutmon = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT21-011")!;
    const tamer = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT1-085")!;
    const source = shoutmon.stack[0]!;
    await scenario.play("Shoutmon X7: Superior Mode", "Digimon");
    const offered: string[] = [];
    let paidOffers = 0;
    await scenario.resolveUntil(
      (s) => JSON.parse(s.pendingDecision?.payloadJson || "{}").digiXrosCardId,
      (decision) => {
        if (decision.kind === "optional") {
          paidOffers++;
          return { accept: true };
        }
        return { cardId: "BT21-011" };
      },
    );
    expect(paidOffers).toBe(1);
    const pending = (await scenario.snapshot()).pendingDecision!;
    const candidates = JSON.parse(pending.payloadJson).candidateInstanceIds as string[];
    offered.push(...candidates);
    expect(offered.sort()).toEqual(
      [
        fixtureInstanceId("hand-card"),
        fixtureInstanceId("trash-0-card"),
        fixtureInstanceId("trash-1-card"),
        fixtureInstanceId("trash-2-card"),
        source.instanceId,
      ].sort(),
    );
    expect(offered).not.toContain(shoutmon.topCard.instanceId);
    expect(offered).not.toContain(tamer.stack[0]!.instanceId);
    const picker = page.getByRole("dialog");
    for (const [index, id] of ["BT10-008", "BT10-007", "BT10-009", "BT10-012", "BT10-013"].entries()) {
      await picker
        .getByRole("button", {
          name: `${getCardDefinition(id)!.nameEn} (${index === 4 ? "hand" : "trash"})`,
          exact: true,
        })
        .click();
    }
    await picker.getByRole("button", { name: "DigiXros (5 cards)", exact: true }).click();
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        s.players[0]!.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("superior-card")),
      (decision) => {
        if (decision.kind === "optional") paidOffers++;
        return { accept: false };
      },
    );
    const final = await scenario.snapshot();
    const superior = final.players[0]!.battleArea.find(
      (p) => p.topCard.instanceId === fixtureInstanceId("superior-card"),
    )!;
    expect(superior.stack.map((c) => c.instanceId).sort()).toEqual([...offered, shoutmon.topCard.instanceId].sort());
    expect(final.memory).toBe(1);
    expect(final.turnSeat).toBe(0);
    expect(final.players[0]!.trash).toHaveLength(0);
    expect(
      final.players[0]!.battleArea.find((p) => p.permanentId === tamer.permanentId)!.stack.map((c) => c.instanceId),
    ).toEqual([tamer.stack[0]!.instanceId]);
    expect(paidOffers).toBe(1);
    // The inherited Rush permits an attack on this newly played card while memory stays ours.
    if (set === "bt21") {
      await page.locator(`[data-id="${superior.permanentId}"][role="button"]`).click();
      await page.getByRole("button", { name: "Attack", exact: true }).click();
      await page.locator('[data-drop="opp-security"]').click();
      await scenario.resolveUntil(
        (s) =>
          !s.pendingDecision &&
          !s.combatWindow &&
          s.players[0]!.battleArea.find((p) => p.topCard.instanceId === fixtureInstanceId("superior-card"))
            ?.isSuspended === true,
        () => ({ accept: false }),
      );
      expect((await scenario.snapshot()).players[1]!.securityCount).toBe(before.players[1]!.securityCount - 2);
    }
    await scenario.healthy();
  });
}

test("declining payment keeps trash locked and preserves Shoutmon", async ({ scenario, page }) => {
  await scenario.openFixture(fixtureShoutmonTrashBt21);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const shoutmon = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT21-011")!;
  await scenario.play("Shoutmon X7: Superior Mode", "Digimon");
  await scenario.resolveUntil(
    (s) => JSON.parse(s.pendingDecision?.payloadJson || "{}").digiXrosCardId,
    () => ({ accept: false }),
  );
  const candidates = JSON.parse((await scenario.snapshot()).pendingDecision!.payloadJson)
    .candidateInstanceIds as string[];
  expect(candidates.sort()).toEqual([fixtureInstanceId("hand-card"), shoutmon.topCard.instanceId].sort());
  const picker = page.getByRole("dialog");
  await picker.getByRole("button", { name: `${getCardDefinition("BT10-013")!.nameEn} (hand)`, exact: true }).click();
  await picker.getByRole("button", { name: "DigiXros (1 card)", exact: true }).click();
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      s.players[0]!.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("superior-card")),
    () => ({ accept: false }),
  );
  const final = await scenario.snapshot();
  expect(
    final.players[0]!.battleArea.find((p) => p.permanentId === shoutmon.permanentId)!.stack.map((c) => c.instanceId),
  ).toEqual(shoutmon.stack.map((c) => c.instanceId));
  expect(final.players[0]!.trash.map((c) => c.instanceId).sort()).toEqual(
    before.players[0]!.trash.map((c) => c.instanceId).sort(),
  );
  expect(
    final.players[0]!.battleArea.find((p) => p.topCard.instanceId === fixtureInstanceId("superior-card"))!.stack.map(
      (c) => c.instanceId,
    ),
  ).toEqual([fixtureInstanceId("hand-card")]);
  await scenario.healthy();
});

test("accepting payment then skipping DigiXros keeps the paid source and passes the turn for its final cost", async ({
  scenario,
  page,
}) => {
  await scenario.openFixture(fixtureShoutmonTrashBt21);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const shoutmon = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT21-011")!;
  await scenario.play("Shoutmon X7: Superior Mode", "Digimon");
  await scenario.resolveUntil(
    (s) => JSON.parse(s.pendingDecision?.payloadJson || "{}").digiXrosCardId,
    (decision) => (decision.kind === "optional" ? { accept: true } : { cardId: "BT21-011" }),
  );
  await page.getByRole("button", { name: "Play without DigiXros", exact: true }).click();
  await scenario.resolveUntil(
    (s) =>
      s.turnSeat === 1 &&
      !s.pendingDecision &&
      s.players[0]!.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("superior-card")),
    () => ({ accept: false }),
  );
  const final = await scenario.snapshot();
  const superior = final.players[0]!.battleArea.find(
    (p) => p.topCard.instanceId === fixtureInstanceId("superior-card"),
  )!;
  expect(superior.stack.map((c) => c.instanceId)).toEqual([shoutmon.topCard.instanceId]);
  expect(final.memory).toBe(4);
  expect(final.turnSeat).toBe(1);
  await scenario.healthy();
});
