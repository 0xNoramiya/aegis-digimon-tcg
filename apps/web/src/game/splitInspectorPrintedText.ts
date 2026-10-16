import { getInspectorMarker } from "@/game/getInspectorMarker";

type Params = { text: string };

export function splitInspectorPrintedText({ text }: Params) {
  const normalized = text.replace(/\r\n/g, "\n");
  const requirementStart = /^\s*\[(?:Digivolve|DNA Digivolve|Burst Digivolve|进化|合步进化|爆裂进化)\]/i;
  if (!requirementStart.test(normalized)) {
    return { requirements: "", effects: text };
  }
  const markers = [...normalized.matchAll(/\[[^\]\n]+\]/g)];
  const effectStart = markers.find((match) => getInspectorMarker({ text: match[0] }));
  if (!effectStart || effectStart.index === undefined) {
    return { requirements: "", effects: text };
  }
  const prefix = normalized.slice(0, effectStart.index);
  const clauses = prefix.split(/\n\s*\n/).filter((clause) => clause.trim());
  if (/[＜<][^＞>]+[＞>]/.test(prefix) || clauses.some((clause) => !requirementStart.test(clause))) {
    return { requirements: "", effects: text };
  }
  return { requirements: prefix.trim(), effects: normalized.slice(effectStart.index).trim() };
}
