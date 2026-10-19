import { ArenaInputDevice } from "@/game/input/ArenaInputDevice";
import type { RefObject } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { useArenaInput } from "@/game/input/useArenaInput";
import "@/game/input/arenaInput.css";

type Props = {
  root: RefObject<HTMLElement | null>;
  onCancel: () => void;
};

export function ArenaInput({ root, onCancel }: Props) {
  const { t } = useTranslation();
  const { device, inSurface, canCancel, canInspect, reordering } = useArenaInput({ root, onCancel });
  if (!device) {
    return null;
  }
  const gamepad = device === ArenaInputDevice.GAMEPAD.value;
  return (
    <aside className="arena-input-hints" aria-label={t("game.input.controls")} data-arena-input-device={device}>
      <span>
        <kbd>{gamepad ? "D-pad" : "↑↓←→"}</kbd> {t("game.input.navigate")}
      </span>
      {reordering ? <span>{t("game.input.reorder")}</span> : null}
      <span>
        <kbd>{gamepad ? "A" : "Enter"}</kbd> {t("game.input.select")}
      </span>
      {canCancel ? (
        <span>
          <kbd>{gamepad ? "B" : "Esc"}</kbd> {t("common.cancel")}
        </span>
      ) : null}
      {canInspect ? (
        <span>
          <kbd>{gamepad ? "X" : "I"}</kbd> {t("game.input.inspect")}
        </span>
      ) : null}
      {!inSurface && !reordering ? (
        <span>
          <kbd>{gamepad ? "LB/RB" : "Q/E"}</kbd> {t("game.input.region")}
        </span>
      ) : null}
      <span>
        <kbd>{gamepad ? "R-stick" : "PgUp/PgDn"}</kbd> {t("game.input.scroll")}
      </span>
    </aside>
  );
}
