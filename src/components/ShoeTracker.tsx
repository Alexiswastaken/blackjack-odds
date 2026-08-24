import { RANKS } from '../engine/types';
import { nextCardProbabilities } from '../engine/shoe';
import { useGameStore } from '../store/useGameStore';
import { CardButton } from './CardButton';
import { RANK_LABEL, formatPercent } from './cardLabels';

export function ShoeTracker() {
  const shoe = useGameStore((s) => s.shoe);
  const history = useGameStore((s) => s.history);
  const playCard = useGameStore((s) => s.playCard);
  const undo = useGameStore((s) => s.undo);
  const newShoe = useGameStore((s) => s.newShoe);

  const probabilities = nextCardProbabilities(shoe);
  const maxProbability = Math.max(...RANKS.map((r) => probabilities[r]), 0.0001);
  const recent = history.slice(-24).reverse();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Carte sortie
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cliquez sur chaque carte qui sort, quel qu'en soit le propriétaire.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {RANKS.map((rank) => (
            <CardButton
              key={rank}
              rank={rank}
              remaining={shoe.remaining[rank]}
              hint={formatPercent(probabilities[rank], 1)}
              onClick={(r) => playCard(r, 'shoe')}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0}
            className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-200 transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Annuler la dernière carte
          </button>
          <button
            type="button"
            onClick={() => {
              if (history.length === 0 || confirm('Réinitialiser le sabot après un mélange ?')) {
                newShoe();
              }
            }}
            className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200 transition hover:bg-emerald-400/20"
          >
            Nouveau sabot
          </button>
        </div>

        {recent.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Dernières cartes vues
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {recent.map((entry, index) => (
                <span
                  key={`${entry.rank}-${index}`}
                  title={
                    entry.origin === 'player'
                      ? 'Votre main'
                      : entry.origin === 'dealer'
                        ? 'Carte visible du croupier'
                        : 'Vue à la table'
                  }
                  className={[
                    'tabular rounded-md px-2 py-1 text-xs font-medium',
                    index === 0 ? 'ring-1 ring-emerald-400/60' : '',
                    entry.origin === 'player'
                      ? 'bg-sky-400/15 text-sky-200'
                      : entry.origin === 'dealer'
                        ? 'bg-amber-400/15 text-amber-200'
                        : 'bg-white/[0.06] text-slate-300',
                  ].join(' ')}
                >
                  {RANK_LABEL[entry.rank]}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Probabilité de la prochaine carte
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Calcul exact&nbsp;: cartes restantes du rang ÷ cartes restantes du sabot.
        </p>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="pb-2 font-medium">Rang</th>
              <th className="pb-2 text-right font-medium">Reste</th>
              <th className="pb-2 pl-3 text-right font-medium">Proba</th>
              <th className="w-1/3 pb-2 pl-3 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {RANKS.map((rank) => {
              const p = probabilities[rank];
              return (
                <tr key={rank} className="border-t border-white/5">
                  <td className="py-1.5 font-medium text-slate-200">{RANK_LABEL[rank]}</td>
                  <td className="py-1.5 text-right text-slate-400">{shoe.remaining[rank]}</td>
                  <td className="py-1.5 pl-3 text-right text-slate-200">{formatPercent(p, 2)}</td>
                  <td className="py-1.5 pl-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${rank === 'T' || rank === 'A' ? 'bg-emerald-400' : 'bg-slate-400'}`}
                        style={{ width: `${(p / maxProbability) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {shoe.totalRemaining === 0 && (
          <p className="mt-4 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            Sabot épuisé. Lancez un nouveau sabot.
          </p>
        )}
      </section>
    </div>
  );
}
