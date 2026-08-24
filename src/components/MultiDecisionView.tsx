import { handTotal } from '../engine/hand';
import { nextCardProbabilities } from '../engine/shoe';
import { RANKS, type CardRank } from '../engine/types';
import { useDecisionFor } from '../hooks/useDecision';
import { useT } from '../i18n';
import { MAX_PLAYERS, useGameStore, type MultiTarget } from '../store/useGameStore';
import { CardButton } from './CardButton';
import { RANK_LABEL, formatPercent } from './cardLabels';
import { DecisionResultPanel } from './DecisionResult';
import { Button, Hint, Panel, SectionTitle, Segmented } from './ui';

/**
 * Référence stable pour une place vide.
 *
 * `hands[mySeat] ?? []` créerait un tableau neuf à chaque rendu, ce qui ferait
 * boucler l'effet d'évaluation (nouvelle dépendance → effet → setState → rendu).
 */
const NO_CARDS: CardRank[] = [];

function sameTarget(a: MultiTarget, b: MultiTarget): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'seat' && b.kind === 'seat' ? a.seat === b.seat : true;
}

function HandChips({ cards }: { cards: CardRank[] }) {
  const { t } = useT();
  if (cards.length === 0) {
    return <span className="text-xs text-ink-faint">{t('multi.empty')}</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      {cards.map((rank, index) => (
        <span
          key={`${rank}-${index}`}
          className="tabular rounded bg-raised px-1.5 py-0.5 text-xs font-medium text-ink"
        >
          {RANK_LABEL[rank]}
        </span>
      ))}
    </span>
  );
}

/**
 * Vue multi-joueurs.
 *
 * Les cartes des autres joueurs n'entrent dans le calcul que par un seul canal :
 * elles retirent des cartes du sabot. C'est suffisant — et c'est exactement ce
 * qui rapproche la probabilité calculée de la probabilité réelle de la table.
 */
export function MultiDecisionView() {
  const shoe = useGameStore((s) => s.shoe);
  const multi = useGameStore((s) => s.multi);
  const playCard = useGameStore((s) => s.playCard);
  const undo = useGameStore((s) => s.undo);
  const setPlayerCount = useGameStore((s) => s.setPlayerCount);
  const setMySeat = useGameStore((s) => s.setMySeat);
  const setActiveTarget = useGameStore((s) => s.setActiveTarget);
  const clearRound = useGameStore((s) => s.clearRound);

  const { t, plural, language } = useT();
  const myHand = multi.hands[multi.mySeat] ?? NO_CARDS;
  // La carte retournée porte la décision ; les suivantes ne font que vider le sabot.
  const state = useDecisionFor(myHand, multi.dealerCards[0] ?? null, false);

  const probabilities = nextCardProbabilities(shoe);

  const othersSeen = multi.hands.reduce(
    (sum, hand, index) => (index === multi.mySeat ? sum : sum + hand.length),
    0,
  );

  const targetLabel =
    multi.activeTarget.kind === 'dealer'
      ? t('multi.dealer')
      : multi.activeTarget.seat === multi.mySeat
        ? t('multi.me')
        : t('multi.seat', { seat: multi.activeTarget.seat + 1 });

  const rowClass = (target: MultiTarget) =>
    [
      'themed flex w-full flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
      sameTarget(multi.activeTarget, target)
        ? 'border-accent-line bg-accent-soft'
        : 'border-line bg-surface hover:border-line-strong',
    ].join(' ');

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <section className="space-y-6">
        <div>
          <SectionTitle>{t('multi.title')}</SectionTitle>
          <Hint>{t('multi.help')}</Hint>
        </div>

        <Segmented
          label={t('multi.playerCount')}
          value={multi.playerCount}
          options={Array.from({ length: MAX_PLAYERS }, (_, i) => ({
            value: i + 1,
            label: String(i + 1),
          }))}
          onChange={setPlayerCount}
        />

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setActiveTarget({ kind: 'dealer' })}
            className={rowClass({ kind: 'dealer' })}
          >
            <span className="w-24 shrink-0 text-sm font-medium text-warn-ink">
              {t('multi.dealer')}
            </span>
            <HandChips cards={multi.dealerCards} />
            {multi.dealerCards.length > 0 && (
              <span className="tabular ml-auto text-sm text-ink-muted">
                {handTotal(multi.dealerCards).total}
              </span>
            )}
          </button>

          {multi.hands.map((hand, seat) => {
            const total = handTotal(hand);
            const isMe = seat === multi.mySeat;
            return (
              <div key={seat} className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTarget({ kind: 'seat', seat })}
                  className={`${rowClass({ kind: 'seat', seat })} flex-1`}
                >
                  <span
                    className={`w-24 shrink-0 text-sm font-medium ${isMe ? 'text-info-ink' : 'text-ink'}`}
                  >
                    {isMe ? t('multi.me') : t('multi.seat', { seat: seat + 1 })}
                  </span>
                  <HandChips cards={hand} />
                  {hand.length > 0 && (
                    <span className="tabular ml-auto text-sm text-ink-muted">
                      {total.total}
                      {total.soft && (
                        <span className="ml-1 text-xs text-ink-subtle">{t('decision.soft')}</span>
                      )}
                    </span>
                  )}
                </button>
                {!isMe && (
                  <button
                    type="button"
                    onClick={() => setMySeat(seat)}
                    title={t('multi.setMySeat')}
                    className="themed rounded-xl border border-line bg-surface px-2 text-[11px] text-ink-subtle transition hover:border-line-strong hover:text-ink"
                  >
                    {t('multi.mySeat')}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div>
          <SectionTitle>{t('multi.cardGrid')}</SectionTitle>
          <Hint>
            {t('multi.activeHelp', { target: targetLabel })}
            {multi.activeTarget.kind === 'dealer' && ` — ${t('multi.dealerHelp')}`}
          </Hint>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {RANKS.map((rank) => (
              <CardButton
                key={rank}
                rank={rank}
                remaining={shoe.remaining[rank]}
                hint={formatPercent(probabilities[rank], language, 1)}
                onClick={(r) =>
                  playCard(
                    r,
                    multi.activeTarget.kind === 'dealer'
                      ? { kind: 'multi-dealer' }
                      : { kind: 'multi-seat', seat: multi.activeTarget.seat },
                  )
                }
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={undo}>{t('shoe.undo')}</Button>
          <Button onClick={clearRound}>{t('multi.newRound')}</Button>
          {othersSeen > 0 && (
            <span className="text-xs text-ink-subtle">
              {t('multi.othersSeen', { count: plural('unit.card', othersSeen) })}
            </span>
          )}
        </div>
        <p className="text-xs text-ink-faint">{t('multi.newRound.note')}</p>
      </section>

      <section>
        <DecisionResultPanel state={state} incompleteMessage={t('multi.myHandIncomplete')} />
        {state.status === 'incomplete' && (
          <Panel className="mt-4">
            <p className="text-xs text-ink-subtle">{t('decision.nextHand.note')}</p>
          </Panel>
        )}
      </section>
    </div>
  );
}
