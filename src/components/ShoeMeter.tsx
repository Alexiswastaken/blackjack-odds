import { fullShoeSize, useGameStore } from '../store/useGameStore';
import { useT } from '../i18n';
import { formatPercent } from './cardLabels';

/** Indicateur permanent : où en est-on dans le sabot ? */
export function ShoeMeter() {
  const shoe = useGameStore((s) => s.shoe);
  const { t, language } = useT();

  const full = fullShoeSize(shoe.decks);
  const dealt = full - shoe.totalRemaining;
  const penetration = full === 0 ? 0 : dealt / full;

  return (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight">
        <div className="tabular text-sm font-semibold text-ink">
          {shoe.totalRemaining}
          <span className="text-ink-subtle"> / {full}</span>
        </div>
        <div className="text-[11px] text-ink-subtle">
          {t('meter.seen', { dealt, percent: formatPercent(penetration, language, 0) })}
        </div>
      </div>
      <div className="h-2 w-28 overflow-hidden rounded-full bg-track">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${Math.max(0, Math.min(100, (1 - penetration) * 100))}%` }}
        />
      </div>
    </div>
  );
}
