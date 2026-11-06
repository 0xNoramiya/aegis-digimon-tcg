import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

function validateCollectionReport(report: unknown) {
  if (
    typeof report !== "object" ||
    report === null ||
    !("errors" in report) ||
    !Array.isArray(report.errors) ||
    !("config" in report) ||
    typeof report.config !== "object" ||
    report.config === null ||
    !("projects" in report.config) ||
    !Array.isArray(report.config.projects) ||
    !("suites" in report) ||
    !Array.isArray(report.suites)
  ) {
    throw new Error("Invalid Playwright collection report");
  }
  const projects: Array<{ testIgnore: string[] }> = [];
  for (const project of report.config.projects) {
    if (
      typeof project !== "object" ||
      project === null ||
      !("testIgnore" in project) ||
      !Array.isArray(project.testIgnore) ||
      !project.testIgnore.every((value: unknown) => typeof value === "string")
    ) {
      throw new Error("Invalid Playwright project");
    }
    const testIgnore: string[] = [];
    for (const value of project.testIgnore) {
      if (typeof value !== "string") throw new Error("Invalid Playwright ignore");
      testIgnore.push(value);
    }
    projects.push({ testIgnore });
  }
  const titles: string[] = [];
  for (const suite of report.suites) {
    if (typeof suite !== "object" || suite === null || !("title" in suite) || typeof suite.title !== "string") {
      throw new Error("Invalid Playwright suite");
    }
    titles.push(suite.title);
  }

  return { errors: report.errors, projects, titles };
}

it("rejects malformed collection report shapes", () => {
  for (const value of [
    null,
    {},
    { errors: [], config: { projects: [null] }, suites: [] },
    { errors: [], config: { projects: [{ testIgnore: [1] }] }, suites: [] },
    { errors: [], config: { projects: [] }, suites: [{ title: 42 }] },
  ]) {
    expect(() => validateCollectionReport(value)).toThrow(/Invalid Playwright/);
  }
});

it("selects the exact private spec inventory by URL presence, leaving URL validation to the native guard", () => {
  const cwd = fileURLToPath(new URL("../..", import.meta.url));
  const cli = fileURLToPath(new URL("../../node_modules/@playwright/test/cli.js", import.meta.url));
  const dependent = [
    "private-sealed-no-name.spec.ts",
    "private-sealed.spec.ts",
    "sealed-opening-gate.spec.ts",
    "sealed-native-touch.spec.ts",
  ];
  const inventory = readdirSync(`${cwd}/e2e`, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith(".spec.ts"))
    .sort();
  for (const connectionString of [
    undefined,
    "",
    "postgres://postgres@127.0.0.1:55439/aegis_sealed_test",
    "invalid-nonempty",
  ]) {
    const directory = mkdtempSync(join(tmpdir(), "sealed-collection-"));
    const reportPath = join(directory, "report.json");
    const env: NodeJS.ProcessEnv = { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath };
    if (connectionString === undefined) delete env.SEALED_TEST_DATABASE_URL;
    else env.SEALED_TEST_DATABASE_URL = connectionString;
    try {
      execFileSync(process.execPath, [cli, "test", "--list", "--reporter=json"], {
        cwd,
        env,
        encoding: "utf8",
        timeout: 60_000,
        maxBuffer: 8 * 1024 * 1024,
      });
      const report: unknown = JSON.parse(readFileSync(reportPath, "utf8"));
      const { errors, projects, titles } = validateCollectionReport(report);
      expect(errors).toEqual([]);
      expect(projects.length).toBeGreaterThan(0);
      for (const project of projects) {
        expect(project.testIgnore).toEqual(connectionString ? [] : dependent.map((file) => `**/${file}`));
      }
      const collected = titles.sort();
      expect(collected).toEqual(connectionString ? inventory : inventory.filter((file) => !dependent.includes(file)));
      console.log(JSON.stringify({ lane: connectionString ?? "absent", projects, files: collected }));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
}, 120_000);
