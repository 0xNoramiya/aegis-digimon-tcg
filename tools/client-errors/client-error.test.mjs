import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { SourceMapGenerator } from "source-map";
import { parseStackFrame, symbolicateStack } from "./client-error.mjs";

function writeFixtureMaps(t) {
  const directory = mkdtempSync(`${tmpdir()}/aegis-sourcemaps-`);
  t.after(() => rmSync(directory, { recursive: true }));
  const generator = new SourceMapGenerator({ file: "GameScreen-a1.js" });
  generator.addMapping({
    generated: { line: 1, column: 120 },
    original: { line: 42, column: 6 },
    source: "../../src/game/GameScreen.tsx",
    name: "readHand",
  });
  mkdirSync(`${directory}/assets`);
  writeFileSync(`${directory}/assets/GameScreen-a1.js.map`, generator.toString());
  return directory;
}

const stack = [
  "TypeError: Cannot read properties of undefined (reading 'length')",
  "    at Pe (https://aegis-digi.online/assets/GameScreen-a1.js:1:121)",
  "    at https://aegis-digi.online/assets/unknown-b2.js:3:4",
].join("\n");

test("stack frames from Chrome, Firefox, and Safari are recognized", () => {
  assert.deepEqual(parseStackFrame("    at Pe (https://x.test/assets/a.js:1:2)"), {
    indent: "    ",
    name: "Pe",
    location: "https://x.test/assets/a.js",
    line: 1,
    column: 2,
  });
  assert.equal(parseStackFrame("Pe@https://x.test/assets/a.js:3:4")?.line, 3);
  assert.equal(parseStackFrame("TypeError: boom"), undefined);
});

test("symbolication maps a minified frame to its original source", async (t) => {
  const mapsDirectory = writeFixtureMaps(t);
  assert.equal(
    await symbolicateStack({ stack, mapsDirectory }),
    [
      "TypeError: Cannot read properties of undefined (reading 'length')",
      "    at readHand (../../src/game/GameScreen.tsx:42:7)",
      "    at https://aegis-digi.online/assets/unknown-b2.js:3:4",
    ].join("\n"),
  );
});

test("the symbolicate command reads the stack from stdin", (t) => {
  const mapsDirectory = writeFixtureMaps(t);
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./client-error.mjs", import.meta.url)), "symbolicate", "--maps", mapsDirectory],
    { input: stack, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /at readHand \(\.\.\/\.\.\/src\/game\/GameScreen\.tsx:42:7\)/);
});

test("the command explains its usage when the map directory is missing", () => {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./client-error.mjs", import.meta.url)), "symbolicate"],
    { input: "", encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage: pnpm client-error symbolicate/);
});
