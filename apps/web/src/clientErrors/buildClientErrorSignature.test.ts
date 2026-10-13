import { describe, expect, it } from "vitest";
import { buildClientErrorSignature } from "@/clientErrors/buildClientErrorSignature";
import { findFirstAppFrame } from "@/clientErrors/findFirstAppFrame";
import { normalizeErrorMessage } from "@/clientErrors/normalizeErrorMessage";

const origin = "https://aegis-digi.online";

const chromeStack = [
  "TypeError: Cannot read properties of undefined (reading 'length')",
  "    at https://cdn.example/vendor.js:1:10",
  "    at Pe (https://aegis-digi.online/assets/GameScreen-Dk3x9.js:12:3456)",
  "    at https://aegis-digi.online/assets/index-Ab12.js:1:99",
].join("\n");

const firefoxStack = [
  "Pe@https://aegis-digi.online/assets/GameScreen-Dk3x9.js:12:3456",
  "@https://aegis-digi.online/assets/index-Ab12.js:1:99",
].join("\n");

describe("client error message normalization", () => {
  it("replaces numbers, hex values, and UUIDs so variants share one signature", () => {
    expect(normalizeErrorMessage("Card 42 at 0xFF in room 3f2c1d4e-1111-2222-3333-444455556666")).toBe(
      "Card <n> at <n> in room <id>",
    );
  });

  it("collapses whitespace and bounds the length", () => {
    expect(normalizeErrorMessage("  a \n\t b  ")).toBe("a b");
    expect(normalizeErrorMessage("x".repeat(500))).toHaveLength(200);
  });
});

describe("first app frame", () => {
  it("skips frames from other origins in a Chrome stack", () => {
    expect(findFirstAppFrame({ stack: chromeStack, origin })).toBe("/assets/GameScreen-Dk3x9.js:12:3456");
  });

  it("reads Firefox and Safari frames", () => {
    expect(findFirstAppFrame({ stack: firefoxStack, origin })).toBe("/assets/GameScreen-Dk3x9.js:12:3456");
  });

  it("skips dependency frames served by the development server", () => {
    const stack = [
      "    at render (http://localhost:5173/node_modules/.vite/deps/react-dom.js:5:6)",
      "    at Board (http://localhost:5173/src/game/Board.tsx?t=1:20:4)",
    ].join("\n");
    expect(findFirstAppFrame({ stack, origin: "http://localhost:5173" })).toBe("/src/game/Board.tsx:20:4");
  });

  it("returns nothing when no frame belongs to the app", () => {
    expect(findFirstAppFrame({ stack: "Error\n    at <anonymous>", origin })).toBeUndefined();
  });
});

describe("client error signature", () => {
  it("combines the normalized message with the first app frame", () => {
    expect(buildClientErrorSignature({ message: "Failed on turn 7", stack: chromeStack, origin })).toBe(
      "Failed on turn <n> @ /assets/GameScreen-Dk3x9.js:12:3456",
    );
  });

  it("matches across browsers for the same failure", () => {
    const message = "TypeError: x is undefined";
    expect(buildClientErrorSignature({ message, stack: chromeStack, origin })).toBe(
      buildClientErrorSignature({ message, stack: firefoxStack, origin }),
    );
  });

  it("marks errors without an app frame", () => {
    expect(buildClientErrorSignature({ message: "Script error.", stack: "", origin })).toBe(
      "Script error. @ no-app-frame",
    );
  });
});
