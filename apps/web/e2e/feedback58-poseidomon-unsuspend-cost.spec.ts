import { test, expect } from "./scenario-page";

const HOST = "dev-perm-0-feedback58-host";
const FIRST = "feedback58-link-first";
const SECOND = "feedback58-link-second";

test.use({ holdBotAfterTurn: 1 });

for (const accept of [true, false]) {
  test(`Feedback #58: an unpayable first Link preserves Poseidomon's later unsuspend choice (accept=${accept})`, async ({
    scenario,
    page,
  }) => {
    await scenario.open("arena-feedback58-poseidomon-unsuspend-cost");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const before = await scenario.snapshot();
    await scenario.evolve("Poseidomon", HOST);
    await expect(page.getByRole("dialog", { name: "App Fusion", exact: true })).toHaveAttribute(
      "data-prompt-surface",
      "center",
    );
    await expect(page.getByRole("button", { name: "App Fuse", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "App Fuse", exact: true }).click();
    let unsuspendChoices = 0;
    await scenario.resolveUntil(
      (s) =>
        s.players[0]!.battleArea.find((p) => p.permanentId === HOST)?.linked.some((c) => c.instanceId === FIRST) ===
          true && !s.pendingDecision,
      (decision) => {
        expect(decision.promptText).not.toBe("ArmSuspendRestriction");
        if (decision.kind === "optional") return { accept: true };
        if (decision.options.candidateInstanceIds?.includes(FIRST)) return { instanceId: FIRST };
        return {};
      },
    );
    const evolved = await scenario.snapshot();
    const initialHost = evolved.players[0]!.battleArea.find((p) => p.permanentId === HOST)!;
    expect(evolved.memory).toBe(before.memory);
    expect(evolved.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 1);
    expect(initialHost.topCard.instanceId).toBe("feedback58-poseidomon");
    expect(initialHost.stack.map((c) => c.instanceId)).toEqual(["dev-field-0-feedback58-host", "feedback58-beautymon"]);
    expect(initialHost.linked.map((c) => c.instanceId)).toEqual([FIRST]);
    expect(initialHost.isSuspended).toBe(false);

    await scenario.attack(HOST);
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        !s.combatWindow &&
        s.phase === "Main" &&
        s.players[1]!.securityCount === before.players[1]!.securityCount - 1,
      (decision) => {
        if (decision.kind === "optional") {
          if (decision.promptText === "ArmSuspendRestriction") {
            unsuspendChoices++;
            expect(decision.sourceCardId).toBe("BT23-024");
            return { accept };
          }
          return { accept: decision.sourceCardId === "BT23-024" };
        }
        if (decision.options.candidateInstanceIds?.includes(SECOND)) return { instanceId: SECOND };
        return {};
      },
    );
    const after = await scenario.snapshot();
    const host = after.players[0]!.battleArea.find((p) => p.permanentId === HOST)!;
    expect(unsuspendChoices).toBe(1);
    expect(host.linked.map((c) => c.instanceId)).toEqual([SECOND, FIRST]);
    expect(host.isSuspended).toBe(!accept);
    expect(after.memory).toBe(before.memory);
    expect(after.players[0]!.hand.some((c) => c.instanceId === FIRST || c.instanceId === SECOND)).toBe(false);
    await scenario.healthy();
  });
}
