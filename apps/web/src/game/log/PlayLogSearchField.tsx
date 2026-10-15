import { useEffect, useRef } from "react";
import { useTranslation } from "@/i18n/useTranslation";

type Props = { query: string; matchCount: number; onChange: (value: string) => void };

export function PlayLogSearchField({ query, matchCount, onChange }: Props) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      queueMicrotask(() => input.current?.focus());
    }
  }, []);
  return (
    <div className="play-log__search">
      <input
        ref={input}
        type="search"
        value={query}
        aria-label={t("feed.searchLabel")}
        placeholder={t("feed.searchPlaceholder")}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && query) {
            event.preventDefault();
            event.stopPropagation();
            onChange("");
          }
        }}
      />
      {query ? (
        <button
          type="button"
          aria-label={t("feed.clearSearch")}
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
        >
          ×
        </button>
      ) : null}
      <span className="play-log__match-count" aria-live="polite">
        {t("feed.matchCount", { count: matchCount })}
      </span>
    </div>
  );
}
