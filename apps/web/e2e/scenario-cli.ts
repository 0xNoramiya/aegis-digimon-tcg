import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "vite";
import { RED_DECK } from "../../api/dist/engine/testDecks.js";
import type { ScenarioFixture } from "../../api/src/engine/scenario/types.js";
import { startBrowserServer } from "./server";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const name = process.argv[3];
if (process.argv[2] !== "open" || !name) throw new Error("Expected open <behavior-name|fixture.ts>");
const fixturePath = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)
  ? resolve(root, "apps/api/src/engine/scenarios", `${name}.fixture.ts`)
  : resolve(root, name);
const { default: fixture } = (await import(pathToFileURL(fixturePath).href)) as { default: ScenarioFixture };
if (!fixture) throw new Error(`${fixturePath} must default-export a ScenarioFixture`);

const webPort = Number(process.env.AEGIS_E2E_WEB_PORT ?? 4175);
const edgePort = Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569);
const runtime = await startBrowserServer({ holdBotAllTurns: false, holdBotAfterTurn: 2 });
let web: Awaited<ReturnType<typeof createServer>> | undefined;
try {
  runtime.useFixture(fixture);
  process.env.VITE_AEGIS_API_URL = `ws://127.0.0.1:${edgePort}`;
  const options = { displayName: "Local scenario", seed: 1, deck: RED_DECK, devScenario: "local-fixture" };
  web = await createServer({
    root: resolve(root, "apps/web"),
    server: { host: "127.0.0.1", port: webPort, strictPort: true },
    plugins: [
      {
        name: "local-scenario-options",
        configureServer(server) {
          server.middlewares.use("/e2e/local-scenario.json", (_request, response) => {
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Cache-Control", "no-store");
            response.end(
              JSON.stringify({ joinOptions: options, lab: process.argv.includes("--lab") ? "effects" : undefined }),
            );
          });
        },
      },
    ],
  });
  await web.listen();
} catch (error) {
  await web?.close();
  await runtime.close();
  throw error;
}

const url = `http://127.0.0.1:${webPort}/e2e/harness.html`;
console.log(`Local scenario: ${fixturePath}\n${url}\nReload to restart. Ctrl+C to stop.`);
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await web?.close();
  await runtime.close();
}
process.once("SIGINT", () => void close());
process.once("SIGTERM", () => void close());
if (!process.argv.includes("--no-open")) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
  const child = spawn(command, [url], { stdio: "ignore" });
  child.on("error", () => console.log(`Open ${url} in your browser.`));
}
