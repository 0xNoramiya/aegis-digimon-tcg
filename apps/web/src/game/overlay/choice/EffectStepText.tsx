import "@/game/overlay/effectPromptFamily.css";

export function EffectStepText({ text, emphasis }: { text: string; emphasis?: string }) {
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
