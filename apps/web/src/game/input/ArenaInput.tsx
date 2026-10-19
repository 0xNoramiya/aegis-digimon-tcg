import { ArenaInputDevice } from "@/game/input/ArenaInputDevice";
import type { ReactNode, RefObject } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { useArenaInput } from "@/game/input/useArenaInput";
import "@/game/input/arenaInput.css";

type Props = {
  root: RefObject<HTMLElement | null>;
  onCancel: () => void;
};

type GlyphShape = "face" | "pad";

const keyboardLabels = {
  confirm: "Enter",
  cancel: "Esc",
  inspect: "I",
  regions: "Q E",
  navigate: "↑↓←→",
  scroll: "PgUp PgDn",
};

type HintProps = {
  glyph: string;
  shape?: GlyphShape;
  button?: string;
  secondary?: boolean;
  children: ReactNode;
};

function Hint({ glyph, shape, button, secondary, children }: HintProps) {
  return (
    <span className="arena-input-hint" data-secondary={secondary || undefined}>
      <kbd className="arena-input-glyph" data-shape={shape} data-button={button}>
        {glyph}
      </kbd>
      {children}
    </span>
  );
}

export function ArenaInput({ root, onCancel }: Props) {
  const { t } = useTranslation();
  const { device, layout, inSurface, canCancel, canInspect, reordering } = useArenaInput({ root, onCancel });
  if (!device) {
    return null;
  }
  const gamepad = device === ArenaInputDevice.GAMEPAD.value ? layout : undefined;
  const face = gamepad ? "face" : undefined;
  const labels = gamepad ? { ...gamepad.labels, navigate: "✥", scroll: "RS" } : keyboardLabels;
  return (
    <aside
      className="arena-input-hints"
      aria-label={t("game.input.controls")}
      data-arena-input-device={device}
      data-arena-input-layout={gamepad?.value}
    >
      {reordering ? <span className="arena-input-hint">{t("game.input.reorder")}</span> : null}
      <Hint glyph={labels.confirm} shape={face} button="confirm">
        {t("game.input.select")}
      </Hint>
      {canCancel ? (
        <Hint glyph={labels.cancel} shape={face} button="cancel">
          {t("common.cancel")}
        </Hint>
      ) : null}
      {canInspect ? (
        <Hint glyph={labels.inspect} shape={face} button="inspect">
          {t("game.input.inspect")}
        </Hint>
      ) : null}
      {!inSurface && !reordering ? (
        <Hint glyph={labels.regions} secondary>
          {t("game.input.region")}
        </Hint>
      ) : null}
      <Hint glyph={labels.scroll} shape={gamepad ? "pad" : undefined} secondary>
        {t("game.input.scroll")}
      </Hint>
      <Hint glyph={labels.navigate} shape={gamepad ? "pad" : undefined} secondary>
        {t("game.input.navigate")}
      </Hint>
    </aside>
  );
}
