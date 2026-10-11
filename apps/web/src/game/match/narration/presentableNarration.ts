import { narrationReadingTime, TOUCH_NARRATION_LIFETIME_SCALE, type NarrationItem } from "../../narration";
import { noticeDurationScale } from "../../noticeDuration";

/** Start the reading clock when the animation queue actually publishes this moment. */
export function presentableNarration(
  item: NarrationItem,
  { collapseNarration }: { collapseNarration: boolean },
): NarrationItem {
  const layoutScale = collapseNarration ? TOUCH_NARRATION_LIFETIME_SCALE : 1;
  const scale = layoutScale * noticeDurationScale();
  return {
    ...item,
    ...(scale !== 1 ? { lifetimeMs: Math.round(narrationReadingTime(item) * scale) } : {}),
    createdAt: Date.now(),
  };
}

/** Keep one effect's discarded sources together even when each host arrives in its own batch. */
export function createDiscardedSourcePanels() {
  const groups = new Map<string, Map<string, NonNullable<NarrationItem["panel"]>>>();
  return (item: NarrationItem): NarrationItem => {
    const panel = item.panel;
    if (!panel?.resolutionId || panel.titleKey !== "panel.trashedDigivolutionCards") return item;
    const key = `${panel.resolutionId}:${panel.side}`;
    const group = groups.get(key) ?? new Map();
    group.set(panel.id, panel);
    groups.set(key, group);
    if (groups.size > 200) groups.delete(groups.keys().next().value!);
    const cards = [...group.values()]
      .flatMap((entry) => entry.cards)
      .map((card, index) => ({ ...card, badge: index + 1 }));
    return { ...item, panel: { ...panel, cards, ordered: cards.length > 1 } };
  };
}
