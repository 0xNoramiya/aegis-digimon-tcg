import { gzipSync } from "node:zlib";
import { expect, type Page } from "@playwright/test";
import { replayFixture } from "../test/replays/fixture";

export class ReplayRecordingPage {
  constructor(readonly page: Page) {}
  async open() {
    await this.page.goto("/e2e/replay-harness.html");
    await this.page.getByLabel("Open replay file").setInputFiles({
      name: "match.aegis-replay",
      mimeType: "application/gzip",
      buffer: gzipSync(JSON.stringify(replayFixture())),
    });
    await expect(this.page.getByRole("heading", { name: "Agumon Player vs Gabumon Player" })).toBeVisible();
  }
  async drained() {
    const evidence = () =>
      this.page.evaluate(() =>
        (
          window as unknown as {
            replayEvidence: () => { idle: boolean; failed: string[]; expiries: string[] };
          }
        ).replayEvidence(),
      );
    await expect.poll(async () => (await evidence()).idle).toBe(true);
    expect((await evidence()).failed).toEqual([]);
    expect((await evidence()).expiries).toEqual([]);
  }
}
