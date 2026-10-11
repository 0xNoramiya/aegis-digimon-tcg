import { openFixturePage } from "./scenario-page";
import fixtureSuperHacking from "../../api/src/engine/scenarios/super-hacking.fixture";
import fixtureGymSecurity from "../../api/src/engine/scenarios/gym-security.fixture";
import fixtureGymEmpty from "../../api/src/engine/scenarios/gym-empty.fixture";
import fixtureGymSuppressed from "../../api/src/engine/scenarios/gym-suppressed.fixture";
import fixtureJesmonBt6015 from "../../api/src/engine/scenarios/jesmon-bt6-015.fixture";
import fixturePlutomon from "../../api/src/engine/scenarios/plutomon.fixture";
import fixtureRizegreymon from "../../api/src/engine/scenarios/rizegreymon.fixture";
import fixtureCerberusmon from "../../api/src/engine/scenarios/cerberusmon.fixture";
import fixtureZephagamonOption from "../../api/src/engine/scenarios/zephagamon-option.fixture";
import fixtureZephagamonProtection from "../../api/src/engine/scenarios/zephagamon-protection.fixture";
import fixturePrincemamemon from "../../api/src/engine/scenarios/princemamemon.fixture";
import fixtureBigmamemon from "../../api/src/engine/scenarios/bigmamemon.fixture";
import fixtureGreymonRecovery from "../../api/src/engine/scenarios/greymon-recovery.fixture";
import fixtureMastemonInfermon from "../../api/src/engine/scenarios/mastemon-infermon.fixture";
import fixtureProtoForm from "../../api/src/engine/scenarios/proto-form.fixture";
import fixtureExamonSources from "../../api/src/engine/scenarios/examon-sources.fixture";

import { fixtureVariant, fixtureInstanceId, fixturePermanentId } from "../../api/src/engine/scenario/references";
import { expect, test, type Page } from "@playwright/test";
import { answerActivation } from "./scenario-page";
import { startBrowserServer } from "./server";

class GroupArena {
  constructor(readonly page: Page) {}
  async open(suffix: string) {
    await this.page.addInitScript(() => {
      localStorage.setItem("aegis:locale", "en");
      localStorage.setItem("aegis.action-confirmation.enabled", "false");
      localStorage.setItem("aegis.skip-end-turn-confirmation", "true");
    });
    await openFixturePage(
      this.page,
      fixtureVariant(
        {
          "super-hacking": fixtureSuperHacking,
          "gym-security": fixtureGymSecurity,
          "gym-empty": fixtureGymEmpty,
          "gym-suppressed": fixtureGymSuppressed,
          "jesmon-bt6-015": fixtureJesmonBt6015,
          plutomon: fixturePlutomon,
          rizegreymon: fixtureRizegreymon,
          cerberusmon: fixtureCerberusmon,
          "zephagamon-option": fixtureZephagamonOption,
          "zephagamon-protection": fixtureZephagamonProtection,
          princemamemon: fixturePrincemamemon,
          bigmamemon: fixtureBigmamemon,
          "greymon-recovery": fixtureGreymonRecovery,
          "mastemon-infermon": fixtureMastemonInfermon,
          "proto-form": fixtureProtoForm,
          "examon-sources": fixtureExamonSources,
        },
        suffix!,
      ),
    );

    await expect(this.page.getByRole("dialog", { name: "Connecting bot opponent…", exact: true })).toBeHidden();
    await this.page.getByRole("button", { name: /^end breeding$/i }).click();
    if (suffix === "rizegreymon") await answerActivation(this.page, true);
    await expect(this.page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  }
  async play(name: string) {
    await this.page
      .getByTestId("hand")
      .getByRole("button", { name: `Select ${name}`, exact: true })
      .press("Enter");
    await this.page.getByRole("button", { name: "Play Digimon", exact: true }).click();
  }
  async option(name: string) {
    await this.page
      .getByTestId("hand")
      .getByRole("button", { name: `Select ${name}`, exact: true })
      .press("Enter");
    await this.page.getByRole("button", { name: "Play Option", exact: true }).click();
  }
  async evolve(name: string, baseId: string) {
    await this.page
      .getByTestId("hand")
      .getByRole("button", { name: `Select ${name}`, exact: true })
      .press("Enter");
    await this.page.getByRole("button", { name: "Digivolve", exact: true }).click();
    await this.page.locator(`[data-drop="perm-you"][data-id="${baseId}"]`).click();
  }
  async select(id: string) {
    const card = this.page.getByRole("dialog").locator(`[data-instance-id="${id}"]`);
    await expect(card).toBeVisible();
    await expect(card).toBeEnabled();
    await card.click();
    await this.page.getByRole("button", { name: "Confirm targets", exact: true }).click();
  }
}

test("Greymon visibly recovers EX9 Omnimon Alter-S", async ({ page }) => {
  const server = await startBrowserServer();
  try {
    const arena = new GroupArena(page);
    await arena.open("greymon-recovery");
    await arena.play("Greymon");
    await answerActivation(page, true);
    await arena.select(fixtureInstanceId("greymon-recovery-0-trash-0-card"));
    await expect(page.getByTestId("hand").getByRole("img", { name: "Omnimon Alter-S", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  } finally {
    await page.close();
    await server.close();
  }
});
for (const [suffix, name, result] of [
  ["princemamemon", "PrinceMamemon", "BigMamemon"],
  ["bigmamemon", "BigMamemon", "Bokomon"],
]) {
  test(`${name} visibly plays the revealed ${result}`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      const arena = new GroupArena(page);
      await arena.open(suffix!);
      await arena.evolve(
        name!,
        fixtureVariant(
          {
            "super-hacking": fixturePermanentId("super-hacking-0-field-0"),
            "gym-security": fixturePermanentId("gym-security-0-field-0"),
            "gym-empty": fixturePermanentId("gym-empty-0-field-0"),
            "gym-suppressed": fixturePermanentId("gym-suppressed-0-field-0"),
            "jesmon-bt6-015": fixturePermanentId("jesmon-0-field-0"),
            plutomon: fixturePermanentId("plutomon-0-field-0"),
            rizegreymon: fixturePermanentId("rizegreymon-0-field-0"),
            cerberusmon: fixturePermanentId("cerberusmon-0-field-0"),
            "zephagamon-option": fixturePermanentId("zephagamon-option-0-field-0"),
            "zephagamon-protection": fixturePermanentId("zephagamon-protection-0-field-0"),
            princemamemon: fixturePermanentId("princemamemon-0-field-0"),
            bigmamemon: fixturePermanentId("bigmamemon-0-field-0"),
            "mastemon-infermon": fixturePermanentId("mastemon-infermon-0-field-0"),
            "proto-form": fixturePermanentId("proto-form-0-field-0"),
            "examon-sources": fixturePermanentId("examon-sources-0-field-0"),
          },
          suffix!,
        ),
      );
      await arena.select(
        fixtureVariant(
          {
            princemamemon: fixtureInstanceId("princemamemon-0-deck-2-card"),
            bigmamemon: fixtureInstanceId("bigmamemon-0-deck-2-card"),
          },
          suffix!,
        ),
      );
      await expect(
        page.locator('[data-drop="perm-you"]').getByRole("img", { name: result!, exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    } finally {
      await page.close();
      await server.close();
    }
  });
}

for (const suffix of ["examon-sources", "plutomon", "cerberusmon"]) {
  test(`${suffix}: the reported attack effect reaches a visible choice`, async ({ page }) => {
    const server = await startBrowserServer({ holdBotAllTurns: false });
    try {
      const arena = new GroupArena(page);
      await arena.open(suffix);
      await page
        .locator(
          `[data-drop="perm-you"][data-id="${fixtureVariant({ "super-hacking": fixturePermanentId("super-hacking-0-field-0"), "gym-security": fixturePermanentId("gym-security-0-field-0"), "gym-empty": fixturePermanentId("gym-empty-0-field-0"), "gym-suppressed": fixturePermanentId("gym-suppressed-0-field-0"), "jesmon-bt6-015": fixturePermanentId("jesmon-0-field-0"), plutomon: fixturePermanentId("plutomon-0-field-0"), rizegreymon: fixturePermanentId("rizegreymon-0-field-0"), cerberusmon: fixturePermanentId("cerberusmon-0-field-0"), "zephagamon-option": fixturePermanentId("zephagamon-option-0-field-0"), "zephagamon-protection": fixturePermanentId("zephagamon-protection-0-field-0"), princemamemon: fixturePermanentId("princemamemon-0-field-0"), bigmamemon: fixturePermanentId("bigmamemon-0-field-0"), "mastemon-infermon": fixturePermanentId("mastemon-infermon-0-field-0"), "proto-form": fixturePermanentId("proto-form-0-field-0"), "examon-sources": fixturePermanentId("examon-sources-0-field-0") }, suffix)}"]`,
        )
        .click();
      await page.getByRole("button", { name: "Attack", exact: true }).click();
      await page
        .locator(
          `[data-drop="perm-opp"][data-id="${fixtureVariant({ "super-hacking": fixturePermanentId("super-hacking-1-field-0"), plutomon: fixturePermanentId("plutomon-1-field-0"), cerberusmon: fixturePermanentId("cerberusmon-1-field-0"), "zephagamon-option": fixturePermanentId("zephagamon-option-1-field-0"), "zephagamon-protection": fixturePermanentId("zephagamon-protection-1-field-0"), "mastemon-infermon": fixturePermanentId("mastemon-infermon-1-field-0"), "proto-form": fixturePermanentId("proto-form-1-field-0"), "examon-sources": fixturePermanentId("examon-sources-1-field-0") }, suffix)}"]`,
        )
        .click();
      // Confirm the printed attack effects in the order chooser when one opens.
      const order = page.getByRole("button", { name: "Select all, top to bottom", exact: true });
      if (await order.isVisible()) {
        await order.click();
        await page.getByRole("button", { name: /resolve.*effect/i }).click();
      }
      if (suffix === "examon-sources") {
        await answerActivation(page, true);
        await arena.select(
          fixtureVariant(
            {
              "gym-suppressed": fixtureInstanceId("gym-suppressed-0-source-0-0-card"),
              rizegreymon: fixtureInstanceId("rizegreymon-0-source-0-0-card"),
              "proto-form": fixtureInstanceId("proto-form-0-source-0-0-card"),
              "examon-sources": fixtureInstanceId("examon-sources-0-source-0-0-card"),
            },
            suffix!,
          ),
        );
        await expect(
          page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Coredramon", exact: true }),
        ).toBeVisible();
      } else {
        // The hand-trash processing cost must be visible and payable.
        await page.getByTestId("hand").getByRole("button", { name: "Pick Yokomon", exact: true }).click();
        await page.getByRole("button", { name: "End Selection", exact: true }).click();
        if (suffix === "cerberusmon") {
          await answerActivation(page, true);
          await arena.select(
            fixtureVariant(
              {
                "super-hacking": fixtureInstanceId("super-hacking-0-trash-0-card"),
                "jesmon-bt6-015": fixtureInstanceId("jesmon-0-trash-0-card"),
                plutomon: fixtureInstanceId("plutomon-0-trash-0-card"),
                cerberusmon: fixtureInstanceId("cerberusmon-0-trash-0-card"),
                "greymon-recovery": fixtureInstanceId("greymon-recovery-0-trash-0-card"),
              },
              suffix!,
            ),
          );
          await page.getByRole("button", { name: "Yes, activate", exact: true }).click();
          await expect(
            page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Goblimon", exact: true }),
          ).toBeVisible();
        } else {
          await answerActivation(page, true);
          await arena.select(
            fixtureVariant(
              {
                "super-hacking": fixtureInstanceId("super-hacking-0-trash-0-card"),
                "jesmon-bt6-015": fixtureInstanceId("jesmon-0-trash-0-card"),
                plutomon: fixtureInstanceId("plutomon-0-trash-0-card"),
                cerberusmon: fixtureInstanceId("cerberusmon-0-trash-0-card"),
                "greymon-recovery": fixtureInstanceId("greymon-recovery-0-trash-0-card"),
              },
              suffix!,
            ),
          );
          await expect(
            page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Gekomon", exact: true }),
          ).toBeVisible();
        }
      }
    } finally {
      await page.close();
      await server.close();
    }
  });
}

test("Jesmon offers the trash Sistermon branch in the browser", async ({ page }) => {
  const server = await startBrowserServer({ holdBotAllTurns: false });
  try {
    const arena = new GroupArena(page);
    await arena.open("jesmon-bt6-015");
    await arena.evolve("Jesmon", fixturePermanentId("jesmon-0-field-0"));
    await page.getByRole("button", { name: /SaviorHuckmon Lv.5/ }).click();
    const sistermon = page.getByRole("button", { name: "Play a Sistermon from hand or trash", exact: true });
    await expect(sistermon).toBeVisible();
    await sistermon.click();
    await arena.select(fixtureInstanceId("jesmon-0-trash-0-card"));
    await expect(
      page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Sistermon Blanc", exact: true }),
    ).toBeVisible();
  } finally {
    await page.close();
    await server.close();
  }
});

for (const suffix of ["gym-security", "gym-empty"]) {
  test(`${suffix}: Security places the Gym in the browser`, async ({ page }) => {
    const server = await startBrowserServer({ holdBotAllTurns: false });
    try {
      const arena = new GroupArena(page);
      await arena.open(suffix);
      await page
        .locator(
          `[data-drop="perm-you"][data-id="${fixtureVariant({ "super-hacking": fixturePermanentId("super-hacking-0-field-0"), "gym-security": fixturePermanentId("gym-security-0-field-0"), "gym-empty": fixturePermanentId("gym-empty-0-field-0"), "gym-suppressed": fixturePermanentId("gym-suppressed-0-field-0"), "jesmon-bt6-015": fixturePermanentId("jesmon-0-field-0"), plutomon: fixturePermanentId("plutomon-0-field-0"), rizegreymon: fixturePermanentId("rizegreymon-0-field-0"), cerberusmon: fixturePermanentId("cerberusmon-0-field-0"), "zephagamon-option": fixturePermanentId("zephagamon-option-0-field-0"), "zephagamon-protection": fixturePermanentId("zephagamon-protection-0-field-0"), princemamemon: fixturePermanentId("princemamemon-0-field-0"), bigmamemon: fixturePermanentId("bigmamemon-0-field-0"), "mastemon-infermon": fixturePermanentId("mastemon-infermon-0-field-0"), "proto-form": fixturePermanentId("proto-form-0-field-0"), "examon-sources": fixturePermanentId("examon-sources-0-field-0") }, suffix)}"]`,
        )
        .click();
      await page.getByRole("button", { name: "Attack", exact: true }).click();
      await page.locator('[data-drop="opp-security"]').click();
      await expect(
        page
          .locator('[data-drop="perm-opp"]')
          .getByRole("img", { name: "The Sistermon Sisters Training Gym", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    } finally {
      await page.close();
      await server.close();
    }
  });
}

for (const suffix of ["super-hacking", "zephagamon-protection"]) {
  test(`${suffix}: deletion resolves its reactive effect`, async ({ page }) => {
    const server = await startBrowserServer({ holdBotAllTurns: false });
    try {
      const arena = new GroupArena(page);
      await arena.open(suffix);
      await arena.option("Happy Bullet Showering");
      if (suffix === "super-hacking") {
        await answerActivation(page, true, "When Digimon are deleted");
        await page.getByRole("button", { name: "Yes, activate", exact: true }).click();
        await arena.select(
          fixtureVariant(
            {
              "super-hacking": fixtureInstanceId("super-hacking-0-trash-0-card"),
              "jesmon-bt6-015": fixtureInstanceId("jesmon-0-trash-0-card"),
              plutomon: fixtureInstanceId("plutomon-0-trash-0-card"),
              cerberusmon: fixtureInstanceId("cerberusmon-0-trash-0-card"),
              "greymon-recovery": fixtureInstanceId("greymon-recovery-0-trash-0-card"),
            },
            suffix!,
          ),
        );
        await expect(
          page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Raidramon", exact: true }),
        ).toBeVisible();
      } else {
        await expect(
          page.locator('[data-drop="perm-opp"]').getByRole("img", { name: "Zephagamon", exact: true }),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: "Agumon (Suspended)", exact: true })).toBeVisible();
      }
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    } finally {
      await page.close();
      await server.close();
    }
  });
}

test("Proto Form shows both eligible sources and returns the selected card", async ({ page }) => {
  const server = await startBrowserServer({ holdBotAllTurns: false });
  try {
    const arena = new GroupArena(page);
    await arena.open("proto-form");
    await page.getByRole("button", { name: /^end turn$/i }).click();
    await arena.select(fixtureInstanceId("proto-form-0-source-0-1-card"));
    await expect(page.getByTestId("hand").getByRole("img", { name: "Monodramon", exact: true })).toBeVisible();
    await expect(page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Agumon", exact: true })).toHaveCount(
      0,
    );
  } finally {
    await page.close();
    await server.close();
  }
});

test("Mastemon places an actively protected Infermon into security", async ({ page }) => {
  const server = await startBrowserServer({ holdBotAllTurns: false });
  try {
    const arena = new GroupArena(page);
    await arena.open("mastemon-infermon");
    await page.getByRole("button", { name: /^end turn$/i }).click();
    await expect(
      page.locator('[data-drop="perm-opp"]').getByRole("img", { name: "Infermon", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^end breeding$/i }).click();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    await page.getByRole("button", { name: "Titamon", exact: true }).click();
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    await page.locator('[data-drop="opp-security"]').click();
    await answerActivation(page, true);
    // A board click before the target rail opens inspects the card instead of choosing it.
    await expect(page.getByRole("region", { name: "Confirm targets", exact: true })).toBeVisible();
    await page
      .locator('[data-drop="perm-opp"]')
      .filter({ has: page.getByRole("img", { name: "Infermon", exact: true }) })
      .click();
    await page.getByRole("button", { name: "Confirm targets", exact: true }).click();
    await expect(
      page.locator('[data-drop="perm-opp"]').getByRole("img", { name: "Infermon", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Opponent security · 2$/ })).toBeVisible();
  } finally {
    await page.close();
    await server.close();
  }
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`${viewport.name} RizeGreymon pays its Tamer cost and uses a DUAL Option`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const server = await startBrowserServer();
    try {
      const arena = new GroupArena(page);
      await arena.open("rizegreymon");
      await arena.play("RizeGreymon");
      await answerActivation(page, true);
      await expect(
        page.getByTestId("hand").getByRole("button", { name: "Pick ShineGreymon", exact: true }),
      ).toBeEnabled();
      await expect(
        page.getByTestId("hand").getByRole("button", { name: "Pick Marcus Damon & Thomas H. Norstein", exact: true }),
      ).toBeEnabled();
      await page.getByTestId("hand").getByRole("button", { name: "Pick ShineGreymon", exact: true }).click();
      await page.getByRole("button", { name: "End Selection", exact: true }).click();
      await expect(page.getByRole("region", { name: "Confirm targets", exact: true })).toContainText("ShineGreymon");
      await page
        .locator('[data-drop="perm-you"]')
        .filter({ has: page.getByRole("img", { name: "RizeGreymon", exact: true }) })
        .click();
      await page.getByRole("button", { name: "Confirm targets", exact: true }).click();
      await expect(
        page.locator('[data-drop="perm-you"]').getByRole("img", { name: "ShineGreymon", exact: true }),
      ).toBeVisible();
    } finally {
      await page.close();
      await server.close();
    }
  });
}

test("LM-066 cost exposes both opposing Digimon", async ({ page }) => {
  const server = await startBrowserServer();
  try {
    const arena = new GroupArena(page);
    await arena.open("zephagamon-option");
    await arena.option("Zephagamon");
    await page.getByRole("button", { name: "Use as Option", exact: true }).click();
    await page.getByRole("button", { name: "Yes, activate", exact: true }).click();
    await expect(page.getByRole("button", { name: "Agumon (Suspended)", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Agumon Expert (Suspended)", exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Memory: +6", exact: true })).toBeVisible();
  } finally {
    await page.close();
    await server.close();
  }
});

test("Hisyaryumon suppresses Gym Security in the browser", async ({ page }) => {
  const server = await startBrowserServer({ holdBotAllTurns: false });
  try {
    const arena = new GroupArena(page);
    await arena.open("gym-suppressed");
    await page.getByRole("button", { name: "Alphamon", exact: true }).click();
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    await page.locator('[data-drop="opp-security"]').click();
    await expect(page.getByRole("img", { name: "Opponent security · 0", exact: true })).toBeVisible();
    await expect(
      page
        .locator('[data-drop="perm-opp"]')
        .getByRole("img", { name: "The Sistermon Sisters Training Gym", exact: true }),
    ).toHaveCount(0);
  } finally {
    await page.close();
    await server.close();
  }
});
