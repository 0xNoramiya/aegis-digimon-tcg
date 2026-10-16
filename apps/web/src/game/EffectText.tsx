import { getInspectorMarker } from "@/game/getInspectorMarker";
import { useCardTranslations } from "@/i18n/useCardTranslations";
import { getTranslatedCardText } from "@/i18n/getTranslatedCardText";
import { resolveTranslatedKeyword } from "@/i18n/resolveTranslatedKeyword";
import { getTranslatedKeywordReminder } from "@/i18n/getTranslatedKeywordReminder";
import "./EffectText.css";
import { inlineInspectorKeywordLines } from "./arenaInspectorModel";
import { KEYWORD_GLOSSARY } from "./keywordGlossary";
import { keywordRuleHintLink, normalizeKeywordBrackets } from "./keywordReminders";
import { BadgeHint } from "./piece/BadgeHint";

/** A printed keyword, explained on tap when the Comprehensive Rules define it. */
type KeywordParams = { keyword: string; inspector: boolean };

function KeywordMark({ keyword, inspector }: KeywordParams) {
  const translations = useCardTranslations();
  const resolved = resolveTranslatedKeyword({ keyword, translations });
  const label = resolved.label;
  const entry = Object.hasOwn(KEYWORD_GLOSSARY, resolved.base) ? KEYWORD_GLOSSARY[resolved.base] : undefined;
  if (!entry) return <mark data-kind="keyword">{label}</mark>;
  return (
    <BadgeHint
      className="card-effect-text__keyword"
      role={inspector ? "button" : undefined}
      tabIndex={inspector ? 0 : undefined}
      onKeyDown={(event) => {
        if (inspector && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      hint={{
        title: normalizeKeywordBrackets(label),
        description: getTranslatedKeywordReminder({
          keyword: resolved.reminderKeyword,
          fallback: entry.reminder,
          translations,
        }),
        link: keywordRuleHintLink(resolved.base),
      }}
    >
      <mark data-kind="keyword">{label}</mark>
    </BadgeHint>
  );
}

/**
 * Printed timing and keyword markers shared by card details and effect notices.
 * `asciiBrackets` prints the card data's full-width ＜Keyword＞ brackets as <Keyword>.
 */
type Params = { text: string; asciiBrackets?: boolean; inspector?: boolean };

export function EffectText({ text, asciiBrackets = false, inspector = false }: Params) {
  const translations = useCardTranslations({ includePrintedText: true });
  const lines = inlineInspectorKeywordLines(getTranslatedCardText({ text, translations }));
  return (
    <span key={`${asciiBrackets}:${lines}`} className="card-effect-text" data-inspector={inspector || undefined}>
      {lines.split(/(\[[^\]]+\]|＜[^＞]+＞|<[^<>\r\n]+>|（每回合\d+次）)/g).map((part, index) =>
        /^\[/.test(part) || (inspector && /^（每回合\d+次）$/.test(part)) ? (
          <mark
            key={index}
            data-kind="timing"
            data-marker={inspector ? (getInspectorMarker({ text: part }) ?? "reference") : undefined}
          >
            {part}
          </mark>
        ) : /^[＜<].+[＞>]$/.test(part) ? (
          <KeywordMark
            key={index}
            inspector={inspector}
            keyword={asciiBrackets ? normalizeKeywordBrackets(part) : part}
          />
        ) : (
          <span key={index}>{asciiBrackets ? normalizeKeywordBrackets(part) : part}</span>
        ),
      )}
    </span>
  );
}
