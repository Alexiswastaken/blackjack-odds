import { useGameStore, fullShoeSize } from '../store/useGameStore';
import { formatPercent } from './cardLabels';

/** Indicateur permanent : où en est-on dans le sabot ? */
export function ShoeMeter() {
  const shoe = useGameStore((s) => s.shoe);
  const full = fullShoeSize(shoe.decks);
  const dealt = full - shoe.totalRemaining;
  const penetration = full === 0 ? 0 : dealt / full;

  return (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight">
        <div className="tabular text-sm font-semibold text-slate-100">
          {shoe.totalRemaining}
          <span className="text-slate-500"> / {full}</span>
        </div>
        <div className="text-[11px] text-slate-500">
          {dealt} vues · {formatPercent(penetration, 0)} du sabot
        </div>
      </div>
      <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-400 transition-[width] duration-300"
          style={{ width: `${Math.max(0, Math.min(100, (1 - penetration) * 100))}%` }}
        />
      </div>
    </div>
  );
}
