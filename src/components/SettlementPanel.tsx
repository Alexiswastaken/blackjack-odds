import type { RoundSettlement } from '../engine/types';
import { useT } from '../i18n';
import { formatEV } from './cardLabels';
import { Button, Panel } from './ui';

const TONE = {
  win: 'border-accent-line bg-accent-soft text-accent-ink',
  lose: 'border-danger bg-danger-soft text-danger-ink',
  push: 'border-line bg-surface text-ink',
  pending: 'border-line bg-surface text-ink',
} as const;

/**
 * Tour déjà joué : la main du croupier est connue, il n'y a plus rien à estimer.
 *
 * Afficher le résultat plutôt qu'une recommandation périmée évite de laisser
 * croire qu'une décision reste à prendre alors que le coup est terminé.
 */
export function SettlementPanel({
  settlement,
  onNext,
}: {
  settlement: RoundSettlement;
  onNext: () => void;
}) {
  const { t, language } = useT();

  const headline =
    settlement.result === 'win'
      ? t('decision.settled.win')
      : settlement.result === 'lose'
        ? t('decision.settled.lose')
        : t('decision.settled.push');

  const notes = [
    settlement.playerBust && t('decision.settled.playerBust'),
    settlement.dealerBust && t('decision.settled.dealerBust'),
    settlement.playerBlackjack && t('decision.settled.playerBlackjack'),
    settlement.dealerBlackjack && t('decision.settled.dealerBlackjack'),
  ].filter((note): note is string => typeof note === 'string');

  return (
    <div className="space-y-4">
      <div className={`themed rounded-2xl border p-5 ${TONE[settlement.result]}`}>
        <div className="text-[11px] tracking-wider uppercase opacity-70">
          {t('decision.settled.title')}
        </div>
        <div className="mt-1 text-3xl font-semibold">{headline}</div>
        <div className="tabular mt-2 text-sm text-ink-muted">
          {t('decision.settled.detail', {
            player: settlement.playerTotal,
            dealer: settlement.dealerTotal,
          })}
        </div>
        <div className="tabular mt-1 text-sm text-ink-muted">
          {t('decision.settled.payout', { payout: formatEV(settlement.payout, language) })}
        </div>
      </div>

      {notes.length > 0 && (
        <Panel>
          <ul className="space-y-1 text-sm text-ink-muted">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Panel>
      )}

      <Button variant="accent" onClick={onNext}>
        {t('decision.nextHand')}
      </Button>
    </div>
  );
}
