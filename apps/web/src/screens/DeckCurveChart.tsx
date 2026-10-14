import "@/screens/deckBuilder.css";

export interface DeckCurveColumn {
  key: string;
  label: string;
  count: number;
}

interface DeckCurveChartProps {
  label: string;
  columns: DeckCurveColumn[];
  compact?: boolean;
}

export function DeckCurveChart({ label, columns, compact = false }: DeckCurveChartProps) {
  const peak = Math.max(1, ...columns.map((column) => column.count));
  const tallestBar = compact ? 14 : 52;

  return (
    <div className="deck-level-curve-stat" data-compact={compact}>
      <div className={compact ? "aegis-sr-only" : "deck-stat-label"}>{label}</div>
      <div className="deck-level-curve" title={compact ? label : undefined}>
        {columns.map((column) => (
          <div key={column.key} className="deck-level-curve__column">
            <span>{column.count || ""}</span>
            <div
              className="deck-level-curve__bar"
              data-empty={column.count === 0}
              style={{ height: `${(column.count / peak) * tallestBar}px` }}
            />
            <span>{column.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
