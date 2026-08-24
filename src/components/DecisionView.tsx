import { handTotal, isPair } from '../engine/hand';
import { nextCardProbabilities } from '../engine/shoe';
import { RANKS, type Action, type ActionEV, type CardRank } from '../engine/types';
import { useDecision } from '../hooks/useDecision';
import { useGameStore } from '../store/useGameStore';
import { CardButton } from './CardButton';
import { RANK_LABEL, formatEV, formatPercent } from './cardLabels';

const ACTION_LABEL: Record<Action, string> = {
  hit: 'Tirer',
  stand: 'Rester',
  double: 'Doubler',
  split: 'Splitter',
};

const DEALER_OUTCOME_LABELS = ['17', '18', '19', '20', '21', 'Bust'];

function EVRow({ action, best }: { action: ActionEV; best: number }) {
  const isBest = action.available && action.ev === best;
  // Les EV vivent dans [-2, +2] (le double met deux unités en jeu) : une barre
  // centrée sur zéro rend le signe lisible d'un coup d'œil.
  const magnitude = Math.min(Math.abs(action.ev) / 2, 1) * 50;

  return (
    <div
      className={[
        'rounded-xl border px-3 py-2.5 transition',
        isBest
          ? 'border-emerald-400/60 bg-emerald-400/10'
          : action.available
            ? 'border-white/10 bg-white/[0.03]'
            : 'border-white/5 bg-white/[0.01] opacity-50',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-sm font-medium ${isBest ? 'text-emerald-200' : 'text-slate-200'}`}>
          {ACTION_LABEL[action.action]}
          {isBest && <span className="ml-2 text-[10px] uppercase tracking-wider">recommandé</span>}
        </span>
        <span className="tabular text-sm text-slate-300">
          {action.available ? formatEV(action.ev) : '—'}
        </span>
      </div>

      {action.available ? (
        <div className="relative mt-2 h-1.5 w-full rounded-full bg-white/10">
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/25" />
          <div
            className={`absolute top-0 h-full rounded-full ${action.ev >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
            style={
              action.ev >= 0
                ? { left: '50%', width: `${magnitude}%` }
                : { right: '50%', width: `${magnitude}%` }
            }
          />
        </div>
      ) : (
        <div className="mt-1 text-[11px] text-slate-500">{action.unavailableReason}</div>
      )}
    </div>
  );
}

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

  const { status, result, error } = useDecision();
  const probabilities = nextCardProbabilities(shoe);
  const total = handTotal(playerCards);
  const canSplitHand = isPair({ cards: playerCards, isSplit: isSplitHand }) && !isSplitHand;

  const bestEV = result
    ? Math.max(...result.actions.filter((a) => a.available).map((a) => a.ev))
    : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <section className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Carte visible du croupier
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {dealerUpcard
              ? 'Annulez la dernière carte pour la corriger.'
              : 'Une seule carte : celle qui est retournée.'}
          </p>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {RANKS.map((rank) => (
              <CardButton
                key={rank}
                rank={rank}
                remaining={shoe.remaining[rank]}
                disabled={dealerUpcard !== null}
                onClick={(r) => playCard(r, 'dealer')}
              />
            ))}
          </div>
          {dealerUpcard && (
            <div className="mt-3 text-sm text-amber-200">
              Croupier&nbsp;: <span className="font-semibold">{RANK_LABEL[dealerUpcard]}</span>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Ma main</h2>
          <p className="mt-1 text-sm text-slate-500">
            Chaque carte cliquée sort du sabot partagé, y compris celles que vous piochez.
          </p>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {RANKS.map((rank) => (
              <CardButton
                key={rank}
                rank={rank}
                remaining={shoe.remaining[rank]}
                hint={formatPercent(probabilities[rank], 1)}
                onClick={(r: CardRank) => playCard(r, 'player')}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {playerCards.map((rank, index) => (
              <span
                key={`${rank}-${index}`}
                className="tabular rounded-lg bg-sky-400/15 px-2.5 py-1 text-sm font-medium text-sky-200"
              >
                {RANK_LABEL[rank]}
              </span>
            ))}
            {playerCards.length > 0 && (
              <span className="tabular text-sm text-slate-300">
                = <span className="font-semibold">{total.total}</span>
                {total.soft && <span className="ml-1 text-xs text-slate-500">(soft)</span>}
              </span>
            )}
            {isSplitHand && (
              <span className="rounded-md bg-violet-400/15 px-2 py-0.5 text-[11px] text-violet-200">
                main splittée
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={undo}
            className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-200 transition hover:border-white/25"
          >
            Annuler la dernière carte
          </button>
          <button
            type="button"
            onClick={clearHand}
            className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-200 transition hover:border-white/25"
          >
            Main suivante
          </button>
          {canSplitHand && (
            <button
              type="button"
              onClick={startSplitHand}
              className="rounded-lg border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-sm text-violet-200 transition hover:bg-violet-400/20"
            >
              Jouer la main splittée
            </button>
          )}
          {isSplitHand && (
            <button
              type="button"
              onClick={() => setIsSplitHand(false)}
              className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-300 transition hover:border-white/25"
            >
              Ce n'est pas une main splittée
            </button>
          )}
        </div>
        <p className="text-xs text-slate-600">
          «&nbsp;Main suivante&nbsp;» vide la main mais laisse les cartes hors du sabot&nbsp;: elles
          ont réellement été distribuées.
        </p>
      </section>

      <section className="space-y-4">
        {status === 'incomplete' && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
            Renseignez au moins deux cartes en main et la carte visible du croupier pour lancer le
            calcul.
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-6 text-sm text-rose-200">
            Échec du calcul&nbsp;: {error}
          </div>
        )}

        {result && (
          <>
            <div
              className={[
                'rounded-2xl border p-5 transition',
                status === 'computing'
                  ? 'border-white/10 bg-white/[0.03] opacity-60'
                  : 'border-emerald-400/40 bg-emerald-400/10',
              ].join(' ')}
            >
              <div className="text-[11px] uppercase tracking-wider text-emerald-300/70">
                {status === 'computing' ? 'Calcul en cours…' : 'Décision recommandée'}
              </div>
              <div className="mt-1 text-3xl font-semibold text-emerald-200">
                {result.isBlackjack ? 'Blackjack !' : ACTION_LABEL[result.recommended]}
              </div>
              <div className="tabular mt-2 text-sm text-slate-300">
                Total {result.playerTotal}
                {result.playerSoft && ' (soft)'} · EV {formatEV(bestEV)}
              </div>
            </div>

            <div className="grid gap-2">
              {result.actions.map((action) => (
                <EVRow key={action.action} action={action} best={bestEV} />
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Probabilité de buster en tirant
              </h3>
              <div className="tabular mt-1 text-2xl font-semibold text-slate-100">
                {formatPercent(result.bustProbabilityOnHit, 2)}
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-rose-400"
                  style={{ width: `${result.bustProbabilityOnHit * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Issues du croupier
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Conditionnées à l'absence de blackjack. Probabilité de blackjack&nbsp;:{' '}
                <span className="tabular">{formatPercent(result.dealerBlackjackProbability, 2)}</span>
              </p>
              <div className="mt-3 space-y-1.5">
                {result.dealerDistribution.map((p, index) => (
                  <div key={DEALER_OUTCOME_LABELS[index]} className="flex items-center gap-3">
                    <span className="w-10 text-xs text-slate-400">
                      {DEALER_OUTCOME_LABELS[index]}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${index === 5 ? 'bg-emerald-400' : 'bg-slate-400'}`}
                        style={{ width: `${p * 100}%` }}
                      />
                    </div>
                    <span className="tabular w-14 text-right text-xs text-slate-300">
                      {formatPercent(p, 2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <details className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-400">
              <summary className="cursor-pointer text-slate-300">Debug&nbsp;: cache</summary>
              <dl className="tabular mt-3 grid grid-cols-2 gap-y-1">
                <dt>Cache hits</dt>
                <dd className="text-right text-slate-200">{result.cacheStats.hits}</dd>
                <dt>Cache misses</dt>
                <dd className="text-right text-slate-200">{result.cacheStats.misses}</dd>
                <dt>Taux de réutilisation</dt>
                <dd className="text-right text-slate-200">
                  {formatPercent(
                    result.cacheStats.hits / Math.max(1, result.cacheStats.hits + result.cacheStats.misses),
                    1,
                  )}
                </dd>
                <dt>États mémorisés</dt>
                <dd className="text-right text-slate-200">{result.cacheStats.size}</dd>
                <dt>Temps de calcul</dt>
                <dd className="text-right text-slate-200">{result.computeTimeMs} ms</dd>
              </dl>
            </details>
          </>
        )}
      </section>
    </div>
  );
}
