import { useTranslation } from "@/i18n/useTranslation";
import { countDeckCostCurve } from "@/screens/countDeckCostCurve";
import { DeckCurveChart } from "@/screens/DeckCurveChart";
import type { CountMap } from "@/screens/deckCounts";

interface DeckCostCurveProps {
  main: CountMap;
}

export function DeckCostCurve({ main }: DeckCostCurveProps) {
  const { t } = useTranslation();
  const columns = countDeckCostCurve({ main }).map((bucket) => ({
    key: String(bucket.cost),
    label: bucket.includesHigher ? `${bucket.cost}+` : String(bucket.cost),
    count: bucket.count,
  }));
  return <DeckCurveChart label={t("deck.costCurve")} columns={columns} />;
}
