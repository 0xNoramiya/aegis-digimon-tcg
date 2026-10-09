import { test, expect } from "./scenario-page";

test("GitHub #5422: a timed Magnamon would-leave prompt waits for the security reveal", async ({ scenario }) => {
  await scenario.open("arena-github-5422-magnamon-timed-security");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.attack("arena-github-5422-magnamon-timed-security-0-field-0");
  await scenario.resolveUntil(
    (s) => !s.pendingDecision && !s.combatWindow && s.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST9-02"),
  );
  const { steps } = await scenario.presentation();
  const revealEnd = Math.max(
    ...steps.filter((s) => s.phase === "finished" && /^security-(break|clash)-\d/.test(s.id)).map((s) => s.at),
  );
  const early = steps
    .filter(
      (s) =>
        s.phase === "finished" &&
        s.at < revealEnd &&
        (s.id.startsWith("draw-flight-") || s.id.startsWith("effect-unit-announce-")),
    )
    .map((s) => s.id);
  expect(Number.isFinite(revealEnd)).toBe(true);
  expect(early).toEqual([]);
  await scenario.healthy({ timedCatchUp: true });
});

test.describe("GitHub #5425: Craniamon's unsuspend boost during an effect-ordered attack", () => {
  test.use({
    holdBotAfterTurn: 3,
    // A list option must use Playwright's [value, options] form, or it is read as that pair.
    botMainIntents: [
      [{ type: "playCard", instanceId: "arena-github-5425-craniamon-guardromon-1-hand-0" }, { type: "endPhase" }],
      { scope: "test" },
    ],
    botOptionalScript: { sourceCardId: "BT25-016", answers: [true] },
  });

  test("the derived boost resolves before the older sweep and the battle", async ({ scenario }) => {
    const { page } = scenario;
    const craniamon = "arena-github-5425-craniamon-guardromon-0-field-0";
    await scenario.open("arena-github-5425-craniamon-guardromon");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    await page.getByRole("button", { name: /^End turn$/i }).click();
    const prompt = page.getByRole("region", { name: "Block window", exact: true });
    // The bot paces its own turn: phase narration and think time come before its play.
    await expect(prompt).toBeVisible({ timeout: 40_000 });
    await page.locator(`[data-drop="perm-you"][data-id="${craniamon}"]`).click();
    await scenario.resolveUntil(
      (s) => !s.pendingDecision && !s.combatWindow && s.turnSeat === 0,
      (d) => (d.kind === "orderTriggers" ? { triggerCardId: "EX13-051" } : {}),
    );
    const events = (await scenario.presentation()).events;
    const resolved = (pattern: RegExp) =>
      events.findIndex(
        (e) => e.kind === "effectResolved" && e.sourceCardId === "EX13-062" && pattern.test(e.description ?? ""),
      );
    const boost = resolved(/unsuspends/i);
    const sweep = resolved(/suspends, you may/i);
    const battle = events.findIndex((e) => e.kind === "battleCompared");
    expect(boost).toBeGreaterThanOrEqual(0);
    expect(boost).toBeLessThan(sweep);
    expect(boost).toBeLessThan(battle);
    expect((await scenario.snapshot()).players[0]!.battleArea.some((p) => p.permanentId === craniamon)).toBe(true);
    await scenario.healthy();
  });
});

test("GitHub #5427: Detach asks yes/no after a security loss and keeps the linked Gomimon", async ({ scenario }) => {
  const { page } = scenario;
  const gomimon = "arena-github-5427-gomimon-detach-0-field-0";
  await scenario.open("arena-github-5427-gomimon-detach");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.attack(gomimon);
  let detachSeen = false;
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      !s.combatWindow &&
      s.players[0]!.trash.some((c) => c.cardId === "BT26-063") &&
      s.players[0]!.battleArea.some((p) => p.permanentId === gomimon),
    async (d) => {
      if (d.kind === "selectCards") return { cardId: "BT26-063" };
      if (d.kind === "optional" && d.promptText.includes("doesn't leave the battle area")) {
        await expect(page.getByText(/trash 1 link card so Gomimon doesn't leave the battle area/)).toBeVisible();
        detachSeen = true;
      }
      return {};
    },
  );
  expect(detachSeen).toBe(true);
  const final = await scenario.snapshot();
  expect(final.players[0]!.battleArea.find((p) => p.permanentId === gomimon)!.linked).toHaveLength(0);
  await scenario.healthy();
});

test("GitHub #5430: Gankoomon's Sistermon Noir with no Sistermon asks only for the De-Digivolve target", async ({
  scenario,
}) => {
  const { page } = scenario;
  await scenario.open("arena-github-5430-gankoomon-noir-no-sistermon");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.attack("arena-github-5430-gankoomon-noir-no-sistermon-0-field-0");
  const victim = "arena-github-5430-gankoomon-noir-no-sistermon-1-field-0";
  let targetPromptSeen = false;
  await scenario.resolveUntil(
    (s) => !s.pendingDecision && !s.combatWindow && s.players[0]!.trash.some((c) => c.cardId === "EX13-066"),
    async (d) => {
      if (d.kind === "selectCards") return { cardId: "EX13-066" };
      if (d.kind !== "chooseTargets" || d.sourceCardId !== "EX13-066") return {};
      await expect(page.getByText("＜De-Digivolve 1＞ for each of your Digimon").first()).toBeVisible();
      await expect(page.getByText(/You may play 1 play cost 4 or lower card/)).toHaveCount(0);
      targetPromptSeen = true;
      return { instanceId: victim };
    },
  );
  expect(targetPromptSeen).toBe(true);
  const final = await scenario.snapshot();
  expect(final.players[1]!.battleArea.find((p) => p.permanentId === victim)!.stack).toHaveLength(1);
  await scenario.healthy();
});

test("GitHub #5431: Yao Qinglan suspends with nothing to place and Poseidia Lagoon digivolves", async ({
  scenario,
}) => {
  await scenario.open("arena-github-5431-yao-suspend-without-placement");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.attack("arena-github-5431-yao-suspend-without-placement-0-field-2");
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT22-027") &&
      !s.pendingDecision &&
      !s.combatWindow &&
      s.players[1]!.securityCount === 2,
    (d) => (d.kind === "selectCards" || d.kind === "chooseTargets" ? { cardId: "BT22-027" } : {}),
  );
  const final = await scenario.snapshot();
  const yao = final.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT19-082")!;
  expect(yao.isSuspended).toBe(true);
  expect(final.memory).toBe(3);
  await scenario.healthy();
});

test("GitHub #5428: MegaKabuterimon offers and pays its [Insectoid] trait cost 3", async ({ scenario }) => {
  const { page } = scenario;
  await scenario.open("arena-github-5428-megakabuterimon-insectoid");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const card = page.locator('[data-hand-instance-id="arena-github-5428-megakabuterimon-insectoid-0-hand-0"]');
  await card.focus();
  await card.press("Enter");
  await page.getByRole("button", { name: "Digivolve", exact: true }).click();
  await page.locator('[data-drop="perm-you"][data-id="arena-github-5428-megakabuterimon-insectoid-0-field-0"]').click();
  await expect(page.locator(".evo-cost-prompt__option")).toHaveCount(2);
  await page.locator(".evo-cost-prompt__option[data-recommended]").click();
  await scenario.resolveUntil((s) => s.players[0]!.battleArea[0]!.topCard.cardId === "P-140" && !s.pendingDecision);
  expect((await scenario.snapshot()).memory).toBe(3);
  await scenario.healthy();
});

test.describe("GitHub #5423: Knightmon on an opposing attack", () => {
  test.use({
    holdBotAfterTurn: 3,
    // A list option must use Playwright's [value, options] form, or it is read as that pair.
    botMainIntents: [
      [
        {
          type: "attack",
          attackerPermanentId: "arena-github-5423-knightmon-opponent-attack-1-field-0",
          target: { kind: "player" },
        },
        { type: "endPhase" },
      ],
      { scope: "test" },
    ],
  });

  test("the inherited play lands before blocker timing and the new Gotsumon blocks", async ({ scenario }) => {
    const { page } = scenario;
    await scenario.open("arena-github-5423-knightmon-opponent-attack");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    await page.getByRole("button", { name: /^End turn$/i }).click();
    // The bot paces its own turn: phase narration and think time come before the scripted attack.
    await expect
      .poll(async () => (await scenario.snapshot()).pendingDecision?.kind, { timeout: 40_000 })
      .toBe("optional");
    await scenario.resolveUntil(
      (s) => s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT2-054") && !s.pendingDecision,
      (d) => (d.kind === "selectCards" ? { cardId: "BT2-054" } : {}),
    );
    const prompt = page.getByRole("region", { name: "Block window", exact: true });
    await expect(prompt).toBeVisible();
    const gotsumon = (await scenario.snapshot()).players[0]!.battleArea.find((p) => p.topCard.cardId === "BT2-054")!;
    await page.locator(`[data-drop="perm-you"][data-id="${gotsumon.permanentId}"]`).click();
    await scenario.resolveUntil((s) => !s.pendingDecision && !s.combatWindow && s.turnSeat === 0);
    const final = await scenario.snapshot();
    expect(final.players[0]!.securityCount).toBe(3);
    const events = (await scenario.presentation()).events;
    expect(events.filter((e) => e.kind === "blocked")).toHaveLength(1);
    expect(events.some((e) => e.kind === "securityChecked")).toBe(false);
    await scenario.healthy();
  });
});
