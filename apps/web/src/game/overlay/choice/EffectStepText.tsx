import "@/game/overlay/effectPromptFamily.css";
import { useCardTranslations } from "@/i18n/useCardTranslations";
import { getTranslatedCardText } from "@/i18n/getTranslatedCardText";

export function EffectStepText({
  text: sourceText,
  emphasis,
  cardId,
}: {
  text: string;
  emphasis?: string;
  cardId?: string;
}) {
  const translations = useCardTranslations({ includePrintedText: true });
  const text = getTranslatedCardText({ text: sourceText, translations, cardId });
  const start = emphasis ? text.toLowerCase().indexOf(emphasis.toLowerCase()) : -1;
  if (!emphasis || start < 0) return text;
  return (
    <>
      {text.slice(0, start)}
      <strong className="decision-overlay__effect-step">{text.slice(start, start + emphasis.length)}</strong>
      {text.slice(start + emphasis.length)}
    </>
  );
}
