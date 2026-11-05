import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BOT_PORTRAIT_FOCUS } from "@/bot/personas/BOT_PORTRAIT_FOCUS";
import { getBotPortraitImageStyle } from "@/bot/personas/getBotPortraitImageStyle";

const portraitDirectory = join(dirname(fileURLToPath(import.meta.url)), "../../../public/assets/bot-portraits");

describe("bot portrait framing", () => {
  it("keeps portraits without a focus point at full size", () => {
    expect(getBotPortraitImageStyle({ source: "/assets/bot-portraits/characters/aegis.webp" })).toBeUndefined();
  });

  it("centers the face when it is away from the edges", () => {
    expect(getBotPortraitImageStyle({ source: "/assets/bot-portraits/digimon/agumon.webp" })).toEqual({
      width: "120%",
      height: "120%",
      left: "-10%",
      top: "0%",
    });
  });

  it("never leaves an empty edge when the face is near a border", () => {
    const style = getBotPortraitImageStyle({ source: "/assets/bot-portraits/characters/arata-sanada.webp" });

    expect(style).toEqual({ width: "200%", height: "200%", left: "-100%", top: "-18%" });
  });

  it("only frames portraits that ship a file", () => {
    const missing = Object.keys(BOT_PORTRAIT_FOCUS).filter(
      (key) => !existsSync(join(portraitDirectory, `${key}.webp`)),
    );

    expect(missing).toEqual([]);
  });

  it("keeps every focus point inside the image with a bounded zoom", () => {
    const invalid = Object.entries(BOT_PORTRAIT_FOCUS).filter(
      ([, { x, y, zoom }]) => x < 0 || x > 1 || y < 0 || y > 1 || zoom <= 1 || zoom > 2,
    );

    expect(invalid).toEqual([]);
  });
});
