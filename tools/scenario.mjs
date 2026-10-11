import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
if (args[0] !== "open" || !args[1] || args.slice(2).some((arg) => arg !== "--no-open")) {
  console.error("Usage: pnpm scenario open <behavior-name|fixture.ts> [--no-open]");
  process.exit(1);
}
if (Number(process.versions.node.split(".")[0]) !== 26) {
  console.error("Use Node 26, as specified in package.json, to run local scenarios.");
  process.exit(1);
}
if (process.env.NODE_ENV === "production") {
  console.error("Local scenarios are unavailable in production.");
  process.exit(1);
}

// Rebuild the real room runtime: fixture runs must not silently use stale API code.
for (const command of [
  ["--filter", "@aegis/shared", "build"],
  ["--filter", "@aegis/api", "exec", "tsc", "-p", "tsconfig.dev.json", "--noCheck"],
  [
    "--filter",
    "@aegis/api",
    "exec",
    "tsx",
    "--tsconfig",
    "../web/e2e/tsconfig.json",
    "../web/e2e/scenario-cli.ts",
    ...args,
  ],
]) {
  const result = spawnSync("pnpm", command, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
