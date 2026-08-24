import type { CardRank } from '../engine/types';
import { useT } from '../i18n';
import { RANK_LABEL } from './cardLabels';

interface CardButtonProps {
  rank: CardRank;
  remaining: number;
  onClick: (rank: CardRank) => void;
  disabled?: boolean;
  /** Info secondaire affichée sous le compteur (probabilité de sortie). */
  hint?: string;
  compact?: boolean;
}

export function CardButton({
  rank,
  remaining,
  onClick,
  disabled,
  hint,
  compact,
}: CardButtonProps) {
  const { t } = useT();
  const exhausted = remaining <= 0;
  const isDisabled = disabled || exhausted;

  return (
    <button
      type="button"
      onClick={() => onClick(rank)}
      disabled={isDisabled}
      title={exhausted ? t('card.exhausted', { rank: RANK_LABEL[rank] }) : undefined}
      className={[
        'group themed flex flex-col items-center justify-center rounded-xl border transition select-none tabular',
        compact ? 'px-1.5 py-2' : 'px-2 py-3',
        isDisabled
          ? 'cursor-not-allowed border-line bg-surface text-ink-faint'
          : 'cursor-pointer border-line bg-raised text-ink hover:border-accent-line hover:bg-accent-soft active:scale-[0.97]',
      ].join(' ')}
    >
      <span
        className={`leading-none font-semibold ${compact ? 'text-lg' : 'text-2xl'}`}
      >
        {RANK_LABEL[rank]}
      </span>
      {!compact && (rank === 'T' || rank === 'A') && (
        <span className="mt-0.5 text-[10px] tracking-wider uppercase text-ink-faint">
          {t(rank === 'T' ? 'card.sub.ten' : 'card.sub.ace')}
        </span>
      )}
      <span
        className={`text-xs font-medium text-ink-muted group-hover:text-accent-ink ${compact ? 'mt-1' : 'mt-2'}`}
      >
        {remaining}
      </span>
      {hint && <span className="text-[10px] text-ink-faint">{hint}</span>}
    </button>
  );
}
