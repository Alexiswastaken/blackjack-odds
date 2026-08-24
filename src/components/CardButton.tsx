import type { CardRank } from '../engine/types';
import { RANK_LABEL, RANK_SUBLABEL } from './cardLabels';

interface CardButtonProps {
  rank: CardRank;
  remaining: number;
  onClick: (rank: CardRank) => void;
  disabled?: boolean;
  /** Info secondaire affichée sous le compteur (probabilité de sortie). */
  hint?: string;
}

export function CardButton({ rank, remaining, onClick, disabled, hint }: CardButtonProps) {
  const exhausted = remaining <= 0;
  const isDisabled = disabled || exhausted;

  return (
    <button
      type="button"
      onClick={() => onClick(rank)}
      disabled={isDisabled}
      title={exhausted ? `Plus aucun ${RANK_LABEL[rank]} dans le sabot` : undefined}
      className={[
        'group flex flex-col items-center justify-center rounded-xl border px-2 py-3 transition',
        'select-none tabular',
        isDisabled
          ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600'
          : 'cursor-pointer border-white/10 bg-white/[0.06] text-slate-100 hover:border-emerald-400/60 hover:bg-emerald-400/10 active:scale-[0.97]',
      ].join(' ')}
    >
      <span className="text-2xl font-semibold leading-none">{RANK_LABEL[rank]}</span>
      {RANK_SUBLABEL[rank] && (
        <span className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">
          {RANK_SUBLABEL[rank]}
        </span>
      )}
      <span className="mt-2 text-xs font-medium text-slate-400 group-hover:text-emerald-200">
        {remaining}
      </span>
      {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
    </button>
  );
}
