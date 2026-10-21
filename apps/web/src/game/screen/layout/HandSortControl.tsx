import { useArenaInputCancel } from "@/game/input/useArenaInputCancel";
/* A split button: the main part re-applies the last sort order, and the caret opens a
   menu that picks another order and applies it at once. The menu is portaled and fixed to
   the caret because the hand tray clips overflow and stacks its cards above the control. */

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Icons } from "../../../design/icons";
import { useTranslation, type TranslationKey } from "../../../i18n";
import { useDismissOnOutsidePress } from "../../chat/useDismissOnOutsidePress";
import { HAND_SORT_MODES, HandSortMode } from "../../handSortMode";

const MODE_LABELS: Record<HandSortMode, TranslationKey> = {
  [HandSortMode.Type]: "game.handSort.type",
  [HandSortMode.Cost]: "game.handSort.cost",
  [HandSortMode.Color]: "game.handSort.color",
};

export function HandSortControl({
  mode,
  disabled,
  onSort,
}: {
  mode: HandSortMode;
  disabled: boolean;
  onSort: (mode: HandSortMode) => void;
}) {
  const { t } = useTranslation();
  const [menuPosition, setMenuPosition] = useState<CSSProperties>();
  const open = menuPosition !== undefined;
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setMenuPosition(undefined), []);
  useDismissOnOutsidePress(menuRef, caretRef.current, close);
  useArenaInputCancel({
    ref: menuRef,
    onCancel: () => {
      close();
      caretRef.current?.focus();
    },
  });

  useEffect(() => {
    if (disabled) close();
  }, [disabled, close]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [open, close]);

  const toggle = () => {
    const caret = caretRef.current;
    if (open || !caret) {
      close();
      return;
    }
    const rect = caret.getBoundingClientRect();
    setMenuPosition({
      right: window.innerWidth - rect.right,
      bottom: window.innerHeight - rect.top + 4,
    });
  };

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }, [open]);

  const modeLabel = t(MODE_LABELS[mode]);
  const choose = (next: HandSortMode) => {
    close();
    caretRef.current?.focus();
    onSort(next);
  };

  return (
    <div className="game-hand-sort" role="group" aria-label={t("settings.sortHand")}>
      <button
        type="button"
        className="game-hand-sort__apply"
        aria-label={`${t("settings.sortHand")}: ${modeLabel}`}
        title={t("settings.sortHandDesc")}
        disabled={disabled}
        onClick={() => onSort(mode)}
      >
        <span aria-hidden="true">
          <Icons.List size={18} />
        </span>
        <span className="game-hand-sort__label">{modeLabel}</span>
      </button>
      <button
        ref={caretRef}
        type="button"
        className="game-hand-sort__mode"
        aria-label={t("game.handSort.choose")}
        title={t("game.handSort.choose")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={toggle}
      >
        <Icons.ChevronDown size={14} aria-hidden="true" />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              className="game-hand-sort__menu"
              style={menuPosition}
              role="menu"
              aria-label={t("game.handSort.choose")}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  close();
                  caretRef.current?.focus();
                  return;
                }
                if (event.key === "Tab") {
                  close();
                  return;
                }
                if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
                const current = items.indexOf(document.activeElement as HTMLButtonElement);
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? items.length - 1
                      : (current + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
                items[next]?.focus();
              }}
            >
              {HAND_SORT_MODES.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="menuitemradio"
                  aria-checked={option === mode}
                  onClick={() => choose(option)}
                >
                  <span className="game-hand-sort__check" aria-hidden="true">
                    {option === mode ? <Icons.Check size={14} /> : null}
                  </span>
                  {t(MODE_LABELS[option])}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
