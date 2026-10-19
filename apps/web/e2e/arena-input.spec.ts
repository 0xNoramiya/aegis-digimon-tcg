import type { Locator, Page } from "@playwright/test";
import fixtureButtonControlledMatch from "../../api/src/engine/scenarios/button-controlled-match.fixture";
import fixtureOrderedPlacement from "../../api/src/engine/scenarios/p240-arcturusmon-ordered-placement.fixture";
import type { ScenarioPage } from "./scenario-page";
import fixtureKudamonMoving from "../../api/src/engine/scenarios/kudamon-moving.fixture";
import { test, expect } from "./scenario-page";

type InputDevice = "keyboard" | "gamepad";
type TestGamepad = { buttons: { pressed: boolean; touched: boolean; value: number }[]; axes: number[] };

declare global {
  interface Window {
    arenaTestGamepad: TestGamepad;
  }
}

async function prepareController(page: Page) {
  await page.addInitScript(() => {
    const pad = {
      connected: true,
      mapping: "standard",
      index: 0,
      id: "Arena test controller",
      timestamp: 0,
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
      axes: [0, 0, 0, 0],
    };
    window.arenaTestGamepad = pad;
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
  });
}

async function pressInput({
  page,
  device,
  key,
  button,
}: {
  page: Page;
  device: InputDevice;
  key: string;
  button: number;
}) {
  if (device === "keyboard") {
    await page.keyboard.press(key);
    return;
  }
  await page.evaluate(async (index) => {
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await frame();
    await frame();
    window.arenaTestGamepad.buttons[index] = { pressed: true, touched: true, value: 1 };
    await frame();
    await frame();
    window.arenaTestGamepad.buttons[index] = { pressed: false, touched: false, value: 0 };
    await frame();
    await frame();
  }, button);
}

async function activate({ locator, page, device }: { locator: Locator; page: Page; device: InputDevice }) {
  await expect(locator).toBeEnabled();
  await locator.focus();
  await pressInput({ page, device, key: "Enter", button: 0 });
}

async function resolveButtonDecisions({
  scenario,
  page,
  device,
  done,
  onOrder,
}: {
  scenario: ScenarioPage;
  page: Page;
  device: InputDevice;
  done: (state: Awaited<ReturnType<ScenarioPage["snapshot"]>>) => boolean;
  onOrder?: (order: string[]) => void;
}) {
  for (let step = 0; step < 20; step++) {
    await expect
      .poll(async () => {
        const state = await scenario.snapshot();
        return (
          done(state) ||
          (!!state.pendingDecision &&
            (await scenario.presentation()).decisions.some(
              (decision) => decision.decisionId === state.pendingDecision!.decisionId,
            ))
        );
      })
      .toBe(true);
    const state = await scenario.snapshot();
    if (done(state)) {
      await scenario.idle();
      return;
    }
    const pending = state.pendingDecision!;
    const request = (await scenario.presentation()).decisions.find(
      (decision) => decision.decisionId === pending.decisionId,
    )!;
    const options = request.options!;
    if (pending.kind === "optional") {
      await activate({ locator: page.getByRole("button", { name: "Yes, activate", exact: true }), page, device });
    } else if (pending.kind === "selectCards" || pending.kind === "chooseTargets") {
      const confirm = page.getByRole("button", {
        name: /^(Confirm targets|End Selection|Confirm|Declare attack|Attack)$/i,
      });
      await expect(confirm).toBeVisible();
      const ids = options.candidateInstanceIds ?? [];
      const wanted = ids.slice(0, Math.min(ids.length, options.max ?? 1, Math.max(2, options.min ?? 1)));
      for (const id of wanted) {
        const gallery = page.getByRole("dialog").locator(`[data-instance-id="${id}"]`);
        const hand = page.locator(`[data-hand-instance-id="${id}"]`);
        if (await gallery.count()) {
          if ((await gallery.getAttribute("aria-pressed")) !== "true") {
            await activate({ locator: gallery, page, device });
          }
        } else if (await hand.count()) {
          await activate({ locator: hand, page, device });
        } else {
          const permanent = state.players
            .flatMap((player) => player.battleArea)
            .find((candidate) => candidate.permanentId === id || candidate.topCard.instanceId === id);
          expect(permanent).toBeTruthy();
          await activate({
            locator: page.locator(`[data-id="${permanent!.permanentId}"][role="button"]`),
            page,
            device,
          });
        }
      }
      await activate({ locator: confirm, page, device });
    } else if (pending.kind === "orderCards") {
      const panel = page.getByRole("dialog");
      const rows = panel.getByRole("listitem");
      await expect(rows).toHaveCount(options.candidateInstanceIds!.length);
      const initial = await rows.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-reorder-id")!),
      );
      const handle = rows.last().getByRole("button", { name: /^Reorder item/ });
      await activate({ locator: handle, page, device });
      await pressInput({ page, device, key: "ArrowUp", button: 12 });
      await pressInput({ page, device, key: "Escape", button: 1 });
      await expect(rows.first()).toHaveAttribute("data-reorder-id", initial[0]!);
      await activate({ locator: rows.last().getByRole("button", { name: /^Reorder item/ }), page, device });
      await pressInput({ page, device, key: "ArrowUp", button: 12 });
      await pressInput({ page, device, key: "Enter", button: 0 });
      const chosen = await rows.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-reorder-id")!),
      );
      expect(chosen).not.toEqual(initial);
      onOrder?.(chosen);
      await activate({ locator: panel.getByRole("button", { name: "Confirm order", exact: true }), page, device });
    } else if (pending.kind === "chooseOption") {
      await activate({
        locator: page.getByRole("dialog").getByRole("button", { name: options.choices![0]!, exact: true }),
        page,
        device,
      });
    } else {
      throw new Error(`Unsupported button decision: ${pending.kind}`);
    }
    await expect.poll(async () => (await scenario.snapshot()).pendingDecision?.decisionId).not.toBe(pending.decisionId);
  }
  throw new Error("Button navigation exceeded 20 decisions");
}

for (const device of ["keyboard", "gamepad"] as const) {
  for (const { width, height, dark } of [
    { width: 1366, height: 768, dark: false },
    { width: 1366, height: 768, dark: true },
    { width: 390, height: 844, dark: false },
    { width: 390, height: 844, dark: true },
  ]) {
    test(`${device} inspects breeding, restores focus, and moves into play at ${width}px dark=${dark}`, async ({
      scenario,
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.addInitScript((value) => localStorage.setItem("aegis:darkMode", String(value)), dark);
      if (device === "gamepad") {
        await prepareController(page);
      }
      await scenario.openFixture(fixtureKudamonMoving, "normal", "none");
      const slot = page.locator('[data-drop="breeding-you"]');
      await expect(page.getByRole("button", { name: /^end breeding$/i })).toBeEnabled();
      await pressInput({ page, device, key: "ArrowRight", button: 15 });
      for (let region = 0; region < 6; region++) {
        if (await slot.evaluate((element) => element === document.activeElement)) {
          break;
        }
        await pressInput({ page, device, key: "e", button: 5 });
      }
      await expect(slot).toBeFocused();
      await pressInput({ page, device, key: "i", button: 2 });
      const inspector = page.getByRole("dialog", { name: "Kudamon", exact: true });
      await expect(inspector).toBeVisible();
      await expect(inspector).toContainText("Pinamon");
      await pressInput({ page, device, key: "Escape", button: 1 });
      await expect(inspector).not.toBeVisible();
      await expect(slot).toBeFocused();
      await activate({ locator: slot, page, device });
      await expect.poll(async () => (await scenario.snapshot()).players[0]!.breeding).toBeFalsy();
      await resolveButtonDecisions({
        scenario,
        page,
        device,
        done: (state) => state.phase === "Main" && !state.pendingDecision,
      });
      const hints = page.getByRole("complementary", { name: "Keyboard and controller" });
      await expect(hints).toHaveAttribute("data-arena-input-device", device);
      const bounds = await hints.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await scenario.idle();
      await scenario.healthy();
    });
  }

  test(`${device} plays from hand, attacks security, and passes the turn`, async ({ scenario, page }) => {
    if (device === "gamepad") {
      await prepareController(page);
    }
    const references = await scenario.openFixture(fixtureButtonControlledMatch, "normal", "none");
    await activate({ locator: page.getByRole("button", { name: /^end breeding$/i }), page, device });
    await scenario.idle();
    const handCard = page.locator(`[data-hand-instance-id="${references.instanceId("playable-rookie")}"]`);
    await activate({ locator: handCard, page, device });
    const handInspector = page.getByRole("dialog", { name: "Monodramon", exact: true });
    await expect(handInspector).toBeVisible();
    await activate({ locator: handInspector.getByRole("button", { name: /^Play Digimon$/i }), page, device });
    await expect
      .poll(async () =>
        (await scenario.snapshot()).players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009"),
      )
      .toBe(true);
    await scenario.idle();
    const before = await scenario.snapshot();
    const dark = before.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT19-063")!;
    const attacker = page.locator(`[data-drop="perm-you"][data-id="${dark.permanentId}"]`);
    await activate({ locator: attacker, page, device });
    const inspector = page.getByRole("dialog", { name: "DarkKnightmon", exact: true });
    await expect(inspector).toBeVisible();
    await activate({ locator: inspector.getByRole("button", { name: /^Attack$/i }), page, device });
    await activate({ locator: page.getByRole("button", { name: /^Opponent security/i }), page, device });
    await expect
      .poll(
        async () =>
          (await scenario.snapshot()).players[0]!.battleArea.find(
            (permanent) => permanent.permanentId === dark.permanentId,
          )?.isSuspended,
      )
      .toBe(true);
    await scenario.idle();
    await activate({ locator: page.getByRole("button", { name: /^End turn$/i }), page, device });
    await expect.poll(async () => (await scenario.snapshot()).turnSeat).toBe(1);
    await scenario.idle();
    await scenario.healthy();
  });

  test(`${device} digivolves, selects multiple cards, and commits a reordered choice`, async ({ scenario, page }) => {
    if (device === "gamepad") {
      await prepareController(page);
    }
    await scenario.openFixture(fixtureOrderedPlacement, "normal", "none");
    await activate({ locator: page.getByRole("button", { name: /^End breeding$/i }), page, device });
    await scenario.idle();
    const before = await scenario.snapshot();
    const base = before.players[0]!.battleArea[0]!;
    await activate({
      locator: page.getByTestId("hand").getByRole("button", { name: "Select Arcturusmon", exact: true }),
      page,
      device,
    });
    await activate({
      locator: page.getByRole("dialog").getByRole("button", { name: "Digivolve", exact: true }),
      page,
      device,
    });
    await activate({ locator: page.locator(`[data-id="${base.permanentId}"][role="button"]`), page, device });
    let chosen: string[] = [];
    await resolveButtonDecisions({
      scenario,
      page,
      device,
      done: (state) => state.players[0]!.battleArea[0]!.stack.length === 4 && !state.pendingDecision,
      onOrder: (order) => {
        chosen = order;
      },
    });
    expect(chosen).toHaveLength(2);
    const after = await scenario.snapshot();
    expect(after.players[0]!.battleArea[0]!.topCard.cardId).toBe("P-240");
    expect(after.players[0]!.battleArea[0]!.stack.slice(0, 2).map((card) => card.instanceId)).toEqual(chosen);
    await scenario.healthy();
  });
}
