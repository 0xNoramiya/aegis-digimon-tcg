import type { CSSProperties } from "react";
import { BOT_PORTRAIT_FOCUS } from "@/bot/personas/BOT_PORTRAIT_FOCUS";

type Params = { source: string };

const portraitDirectory = "/assets/bot-portraits/";
const portraitExtension = ".webp";

function getPortraitKey(source: string): string {
  return source.slice(portraitDirectory.length, -portraitExtension.length);
}

function getOffset({ focus, zoom }: { focus: number; zoom: number }): number {
  return Math.min(0, Math.max(1 - zoom, 0.5 - focus * zoom));
}

function toPercent(value: number): string {
  return `${Number((value * 100).toFixed(2))}%`;
}

export function getBotPortraitImageStyle({ source }: Params): CSSProperties | undefined {
  const focus = BOT_PORTRAIT_FOCUS[getPortraitKey(source)];
  if (!focus) {
    return undefined;
  }
  return {
    width: toPercent(focus.zoom),
    height: toPercent(focus.zoom),
    left: toPercent(getOffset({ focus: focus.x, zoom: focus.zoom })),
    top: toPercent(getOffset({ focus: focus.y, zoom: focus.zoom })),
  };
}
