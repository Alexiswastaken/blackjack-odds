import { settleRound } from '../engine/decide';
import { handTotal } from '../engine/hand';
import { nextCardProbabilities } from '../engine/shoe';
import { RANKS, type CardRank } from '../engine/types';
import { useDecisionFor } from '../hooks/useDecision';
import { useT } from '../i18n';
import {
  MAX_PLAYERS,
  useGameStore,
  type MultiSeat,
  type MultiTarget,
} from '../store/useGameStore';
import { CardButton } from './CardButton';
import { RANK_LABEL, formatPercent } from './cardLabels';
import { DecisionResultPanel } from './DecisionResult';
import { SettlementPanel } from './SettlementPanel';
import { Button, Hint, SectionTitle, Segmented } from './ui';

/** Référence stable pour une main vide : un tableau neuf ferait boucler l'effet. */
const NO_CARDS: CardRank[] = [];

function sameTarget(a: MultiTarget, b: MultiTarget): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'seat' && b.kind === 'seat' ? a.seat === b.seat : true;
}

function canSplitSeat(seat: MultiSeat): boolean {
  if (seat.isSplit || seat.hands.length !== 1) return false;
  const [hand] = seat.hands;
  return hand.length === 2 && hand[0] === hand[1];
}

function HandChips({ cards }: { cards: readonly CardRank[] }) {
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

function HandTotal({ cards }: { cards: readonly CardRank[] }) {
  const { t } = useT();
  if (cards.length === 0) return null;
  const sum = handTotal(cards);
  return (
    <span className="tabular text-sm text-ink-muted">
      {sum.total}
      {sum.soft && <span className="ml-1 text-xs text-ink-subtle">{t('decision.soft')}</span>}
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
  const rules = useGameStore((s) => s.rules);
  const multi = useGameStore((s) => s.multi);
  const playCard = useGameStore((s) => s.playCard);
  const undo = useGameStore((s) => s.undo);
  const setPlayerCount = useGameStore((s) => s.setPlayerCount);
  const setMySeat = useGameStore((s) => s.setMySeat);
  const setActiveTarget = useGameStore((s) => s.setActiveTarget);
  const splitSeat = useGameStore((s) => s.splitSeat);
  const setSeatActiveHand = useGameStore((s) => s.setSeatActiveHand);
  const clearRound = useGameStore((s) => s.clearRound);

  const { t, plural, language } = useT();

  const mySeat = multi.seats[multi.mySeat];
  const myHand = mySeat?.hands[mySeat.activeHand] ?? NO_CARDS;
  // La carte retournée porte la décision ; les suivantes ne font que vider le sabot.
  const state = useDecisionFor(myHand, multi.dealerCards[0] ?? null, mySeat?.isSplit ?? false);
  const settlement = settleRound(myHand, multi.dealerCards, rules);
  const settled = settlement.result !== 'pending';

  const probabilities = nextCardProbabilities(shoe);

  const othersSeen = multi.seats.reduce(
    (sum, seat, index) =>
      index === multi.mySeat
        ? sum
        : sum + seat.hands.reduce((cards, hand) => cards + hand.length, 0),
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
      'themed rounded-xl border px-3 py-2.5 transition',
      sameTarget(multi.activeTarget, target)
        ? 'border-accent-line bg-accent-soft'
        : 'border-line bg-surface',
    ].join(' ');

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <section className="space-y-6">
        <div>
          <SectionTitle>{t('multi.title')}</SectionTitle>
          <Hint>{t('multi.help')}</Hint>
          <Hint>{t('multi.seatHelp')}</Hint>
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
          <div className={rowClass({ kind: 'dealer' })}>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTarget({ kind: 'dealer' })}
                className="flex flex-1 flex-wrap items-center gap-3 text-left"
              >
                <span className="w-24 shrink-0 text-sm font-medium text-warn-ink">
                  {t('multi.dealer')}
                </span>
                <HandChips cards={multi.dealerCards} />
                <span className="ml-auto">
                  <HandTotal cards={multi.dealerCards} />
                </span>
              </button>
            </div>
          </div>

          {multi.seats.map((seat, index) => {
            const isMe = index === multi.mySeat;
            const target: MultiTarget = { kind: 'seat', seat: index };
            const label = isMe ? t('multi.me') : t('multi.seat', { seat: index + 1 });

            return (
              <div key={index} className={rowClass(target)}>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTarget(target)}
                    className="flex flex-1 flex-wrap items-center gap-3 text-left"
                  >
                    <span
                      className={`w-24 shrink-0 text-sm font-medium ${isMe ? 'text-info-ink' : 'text-ink'}`}
                    >
                      {label}
                    </span>
                    {!seat.isSplit && (
                      <>
                        <HandChips cards={seat.hands[0]} />
                        <span className="ml-auto">
                          <HandTotal cards={seat.hands[0]} />
                        </span>
                      </>
                    )}
                    {seat.isSplit && (
                      <span className="rounded-md bg-alt-soft px-2 py-0.5 text-[11px] text-alt-ink">
                        {t('decision.splitBadge')}
                      </span>
                    )}
                  </button>

                  {canSplitSeat(seat) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTarget(target);
                        splitSeat(index);
                      }}
                      className="themed rounded-lg border border-alt bg-alt-soft px-2 py-1 text-[11px] text-alt-ink transition hover:border-alt"
                    >
                      {t('multi.split')}
                    </button>
                  )}

                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => setMySeat(index)}
                      title={t('multi.setMySeat')}
                      className="themed rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-ink-subtle transition hover:border-line-strong hover:text-ink"
                    >
                      {t('multi.mySeat')}
                    </button>
                  )}
                </div>

                {seat.isSplit && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {seat.hands.map((cards, handIndex) => {
                      const active =
                        sameTarget(multi.activeTarget, target) && seat.activeHand === handIndex;
                      return (
                        <button
                          key={handIndex}
                          type="button"
                          onClick={() => {
                            setActiveTarget(target);
                            setSeatActiveHand(index, handIndex);
                          }}
                          className={[
                            'themed flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition',
                            active
                              ? 'border-accent-line bg-accent-soft text-accent-ink'
                              : 'border-line bg-surface text-ink-muted hover:border-line-strong',
                          ].join(' ')}
                        >
                          <span>{t('decision.hand.label', { index: handIndex + 1 })}</span>
                          <HandChips cards={cards} />
                          <HandTotal cards={cards} />
                        </button>
                      );
                    })}
                  </div>
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
                onClick={(r) => {
                  if (multi.activeTarget.kind === 'dealer') {
                    playCard(r, { kind: 'multi-dealer' });
                    return;
                  }
                  const seatIndex = multi.activeTarget.seat;
                  playCard(r, {
                    kind: 'multi-seat',
                    seat: seatIndex,
                    hand: multi.seats[seatIndex]?.activeHand ?? 0,
                  });
                }}
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
        {settled ? (
          <SettlementPanel settlement={settlement} onNext={clearRound} />
        ) : (
          <DecisionResultPanel state={state} incompleteMessage={t('multi.myHandIncomplete')} />
        )}
      </section>
    </div>
  );
}
