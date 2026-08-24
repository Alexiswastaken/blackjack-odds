import { handTotal, isPair } from '../engine/hand';
import { nextCardProbabilities } from '../engine/shoe';
import { RANKS } from '../engine/types';
import { useDecisionFor } from '../hooks/useDecision';
import { useT } from '../i18n';
import { useGameStore } from '../store/useGameStore';
import { CardButton } from './CardButton';
import { RANK_LABEL, formatPercent } from './cardLabels';
import { DecisionResultPanel } from './DecisionResult';
import { Button, Hint, SectionTitle } from './ui';

export function DecisionView() {
  const shoe = useGameStore((s) => s.shoe);
  const playerCards = useGameStore((s) => s.playerCards);
  const dealerUpcard = useGameStore((s) => s.dealerUpcard);
  const isSplitHand = useGameStore((s) => s.isSplitHand);
  const playCard = useGameStore((s) => s.playCard);
  const undo = useGameStore((s) => s.undo);
  const clearHand = useGameStore((s) => s.clearHand);
  const startSplitHand = useGameStore((s) => s.startSplitHand);
  const setIsSplitHand = useGameStore((s) => s.setIsSplitHand);

  const { t, language } = useT();
  const state = useDecisionFor(playerCards, dealerUpcard, isSplitHand);

  const probabilities = nextCardProbabilities(shoe);
  const total = handTotal(playerCards);
  const canSplitHand = isPair({ cards: playerCards, isSplit: isSplitHand }) && !isSplitHand;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <section className="space-y-6">
        <div>
          <SectionTitle>{t('decision.dealer.title')}</SectionTitle>
          <Hint>{t(dealerUpcard ? 'decision.dealer.help.set' : 'decision.dealer.help.empty')}</Hint>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {RANKS.map((rank) => (
              <CardButton
                key={rank}
                rank={rank}
                remaining={shoe.remaining[rank]}
                disabled={dealerUpcard !== null}
                onClick={(r) => playCard(r, { kind: 'solo-dealer' })}
              />
            ))}
          </div>
          {dealerUpcard && (
            <div className="mt-3 text-sm text-warn-ink">
              {t('decision.dealer.value', { card: RANK_LABEL[dealerUpcard] })}
            </div>
          )}
        </div>

        <div>
          <SectionTitle>{t('decision.hand.title')}</SectionTitle>
          <Hint>{t('decision.hand.help')}</Hint>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {RANKS.map((rank) => (
              <CardButton
                key={rank}
                rank={rank}
                remaining={shoe.remaining[rank]}
                hint={formatPercent(probabilities[rank], language, 1)}
                onClick={(r) => playCard(r, { kind: 'solo-player' })}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {playerCards.map((rank, index) => (
              <span
                key={`${rank}-${index}`}
                className="tabular rounded-lg bg-info-soft px-2.5 py-1 text-sm font-medium text-info-ink"
              >
                {RANK_LABEL[rank]}
              </span>
            ))}
            {playerCards.length > 0 && (
              <span className="tabular text-sm text-ink-muted">
                = <span className="font-semibold text-ink">{total.total}</span>
                {total.soft && <span className="ml-1 text-xs text-ink-subtle">{t('decision.soft')}</span>}
              </span>
            )}
            {isSplitHand && (
              <span className="rounded-md bg-alt-soft px-2 py-0.5 text-[11px] text-alt-ink">
                {t('decision.splitBadge')}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={undo}>{t('shoe.undo')}</Button>
          <Button onClick={clearHand}>{t('decision.nextHand')}</Button>
          {canSplitHand && (
            <Button variant="alt" onClick={startSplitHand}>
              {t('decision.playSplit')}
            </Button>
          )}
          {isSplitHand && (
            <Button onClick={() => setIsSplitHand(false)}>{t('decision.notSplit')}</Button>
          )}
        </div>
        <p className="text-xs text-ink-faint">{t('decision.nextHand.note')}</p>
      </section>

      <section>
        <DecisionResultPanel state={state} incompleteMessage={t('decision.incomplete')} />
      </section>
    </div>
  );
}
