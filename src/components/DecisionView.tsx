import { settleRound } from '../engine/decide';
import { handTotal } from '../engine/hand';
import { nextCardProbabilities } from '../engine/shoe';
import { RANKS, type CardRank } from '../engine/types';
import { useDecisionFor } from '../hooks/useDecision';
import { useT } from '../i18n';
import { useGameStore } from '../store/useGameStore';
import { CardButton } from './CardButton';
import { RANK_LABEL, formatPercent } from './cardLabels';
import { DecisionResultPanel } from './DecisionResult';
import { SettlementPanel } from './SettlementPanel';
import { Button, Hint, SectionTitle } from './ui';

/** Référence stable pour une main vide : un tableau neuf ferait boucler l'effet. */
const NO_CARDS: CardRank[] = [];

function Chips({ cards, tone }: { cards: readonly CardRank[]; tone: string }) {
  return (
    <>
      {cards.map((rank, index) => (
        <span
          key={`${rank}-${index}`}
          className={`tabular rounded-lg px-2.5 py-1 text-sm font-medium ${tone}`}
        >
          {RANK_LABEL[rank]}
        </span>
      ))}
    </>
  );
}

export function DecisionView() {
  const shoe = useGameStore((s) => s.shoe);
  const rules = useGameStore((s) => s.rules);
  const playerHands = useGameStore((s) => s.playerHands);
  const activeHand = useGameStore((s) => s.activeHand);
  const isSplit = useGameStore((s) => s.isSplit);
  const dealerCards = useGameStore((s) => s.dealerCards);
  const playCard = useGameStore((s) => s.playCard);
  const undo = useGameStore((s) => s.undo);
  const clearHand = useGameStore((s) => s.clearHand);
  const splitHand = useGameStore((s) => s.splitHand);
  const setActiveHand = useGameStore((s) => s.setActiveHand);

  const { t, language } = useT();

  const hand = playerHands[activeHand] ?? NO_CARDS;
  // La carte retournée porte la décision ; les suivantes ne font que vider le sabot.
  const upcard = dealerCards[0] ?? null;

  const state = useDecisionFor(hand, upcard, isSplit);
  const settlement = settleRound(hand, dealerCards, rules);
  const settled = settlement.result !== 'pending';

  const probabilities = nextCardProbabilities(shoe);
  const total = handTotal(hand);
  const dealerTotal = handTotal(dealerCards);

  const canSplit =
    !isSplit && playerHands.length === 1 && hand.length === 2 && hand[0] === hand[1];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <section className="space-y-6">
        <div>
          <SectionTitle>{t('decision.dealer.title')}</SectionTitle>
          <Hint>
            {t(dealerCards.length === 0 ? 'decision.dealer.help.empty' : 'decision.dealer.help.more')}
          </Hint>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {RANKS.map((rank) => (
              <CardButton
                key={rank}
                rank={rank}
                remaining={shoe.remaining[rank]}
                onClick={(r) => playCard(r, { kind: 'solo-dealer' })}
              />
            ))}
          </div>
          {dealerCards.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Chips cards={dealerCards} tone="bg-warn-soft text-warn-ink" />
              <span className="tabular text-sm text-ink-muted">
                {t('decision.dealer.value', { total: dealerTotal.total })}
                {dealerTotal.soft && (
                  <span className="ml-1 text-xs text-ink-subtle">{t('decision.soft')}</span>
                )}
              </span>
            </div>
          )}
        </div>

        <div>
          <SectionTitle>{t(isSplit ? 'decision.hands.title' : 'decision.hand.title')}</SectionTitle>
          <Hint>{t('decision.hand.help')}</Hint>

          {isSplit && (
            <div className="mt-3 flex flex-wrap gap-2">
              {playerHands.map((cards, index) => {
                const handSum = handTotal(cards);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveHand(index)}
                    className={[
                      'themed tabular rounded-lg border px-3 py-1.5 text-sm transition',
                      index === activeHand
                        ? 'border-accent-line bg-accent-soft text-accent-ink'
                        : 'border-line bg-surface text-ink-muted hover:border-line-strong',
                    ].join(' ')}
                  >
                    {t('decision.hand.label', { index: index + 1 })}
                    {cards.length > 0 && (
                      <span className="ml-2 font-semibold">{handSum.total}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {RANKS.map((rank) => (
              <CardButton
                key={rank}
                rank={rank}
                remaining={shoe.remaining[rank]}
                hint={formatPercent(probabilities[rank], language, 1)}
                onClick={(r) => playCard(r, { kind: 'solo-player', hand: activeHand })}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Chips cards={hand} tone="bg-info-soft text-info-ink" />
            {hand.length > 0 && (
              <span className="tabular text-sm text-ink-muted">
                = <span className="font-semibold text-ink">{total.total}</span>
                {total.soft && (
                  <span className="ml-1 text-xs text-ink-subtle">{t('decision.soft')}</span>
                )}
              </span>
            )}
            {isSplit && (
              <span className="rounded-md bg-alt-soft px-2 py-0.5 text-[11px] text-alt-ink">
                {t('decision.splitBadge')}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={undo}>{t('shoe.undo')}</Button>
          <Button onClick={clearHand}>{t('decision.nextHand')}</Button>
          {canSplit && (
            <Button variant="alt" onClick={splitHand}>
              {t('decision.split.action')}
            </Button>
          )}
        </div>
        <p className="text-xs text-ink-faint">
          {canSplit ? t('decision.split.help') : t('decision.nextHand.note')}
        </p>
      </section>

      <section>
        {settled ? (
          <SettlementPanel settlement={settlement} onNext={clearHand} />
        ) : (
          <DecisionResultPanel state={state} incompleteMessage={t('decision.incomplete')} />
        )}
      </section>
    </div>
  );
}
