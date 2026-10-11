import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Discord 1558643290751115264: the production minifier (Lightning CSS) dropped
// `translate: -50% -50% !important` because the same rule also set `transform`. The centred
// selection dialog lost its vertical centring, and its actions fell below the screen.
describe("prompt stylesheets", () => {
  it("never pair `translate` with `transform` in one rule", () => {
    const directory = new URL("./", import.meta.url);
    const pairedRules = readdirSync(directory)
      .filter((name) => name.endsWith(".css"))
      .flatMap((name) => {
        const source = readFileSync(new URL(name, directory), "utf8");
        return [...source.matchAll(/([^{}]*)\{([^{}]*)\}/g)]
          .filter(([, , body]) => /(^|[\s;])translate:/.test(body!) && /(^|[\s;])transform:/.test(body!))
          .map(([, selector]) => `${name}: ${selector!.trim()}`);
      });
    expect(pairedRules).toEqual([]);
  });
});
