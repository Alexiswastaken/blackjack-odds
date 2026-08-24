import { nextCardProbabilities } from '../engine/shoe';
import { RANKS } from '../engine/types';
import { useT } from '../i18n';
import { useGameStore } from '../store/useGameStore';
import { CardButton } from './CardButton';
import { RANK_LABEL, formatPercent } from './cardLabels';
import { ShoeHistory } from './ShoeHistory';
import { Button, Hint, Panel, SectionTitle } from './ui';

export function ShoeTracker() {
  const shoe = useGameStore((s) => s.shoe);
  const history = useGameStore((s) => s.history);
  const playCard = useGameStore((s) => s.playCard);
  const undo = useGameStore((s) => s.undo);
  const newShoe = useGameStore((s) => s.newShoe);
  const { t, language } = useT();

  const probabilities = nextCardProbabilities(shoe);
  const maxProbability = Math.max(...RANKS.map((r) => probabilities[r]), 0.0001);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <section className="space-y-6">
        <div className="space-y-4">
          <div>
            <SectionTitle>{t('shoe.out.title')}</SectionTitle>
            <Hint>{t('shoe.out.help')}</Hint>
          </div>

          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {RANKS.map((rank) => (
              <CardButton
                key={rank}
                rank={rank}
                remaining={shoe.remaining[rank]}
                hint={formatPercent(probabilities[rank], language, 1)}
                onClick={(r) => playCard(r, { kind: 'shoe' })}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={undo} disabled={history.length === 0}>
              {t('shoe.undo')}
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                if (history.length === 0 || confirm(t('shoe.new.confirm'))) newShoe();
              }}
            >
              {t('shoe.new')}
            </Button>
          </div>
        </div>

        <ShoeHistory />
      </section>

      <Panel>
        <SectionTitle>{t('shoe.probs.title')}</SectionTitle>
        <p className="mt-1 text-xs text-ink-subtle">{t('shoe.probs.help')}</p>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] tracking-wider text-ink-subtle uppercase">
              <th className="pb-2 font-medium">{t('shoe.probs.rank')}</th>
              <th className="pb-2 text-right font-medium">{t('shoe.probs.remaining')}</th>
              <th className="pb-2 pl-3 text-right font-medium">{t('shoe.probs.probability')}</th>
              <th className="w-1/3 pb-2 pl-3 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {RANKS.map((rank) => {
              const p = probabilities[rank];
              const emphasised = rank === 'T' || rank === 'A';
              return (
                <tr key={rank} className="border-t border-line">
                  <td className="py-1.5 font-medium text-ink">{RANK_LABEL[rank]}</td>
                  <td className="py-1.5 text-right text-ink-muted">{shoe.remaining[rank]}</td>
                  <td className="py-1.5 pl-3 text-right text-ink">
                    {formatPercent(p, language, 2)}
                  </td>
                  <td className="py-1.5 pl-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-track">
                      <div
                        className={`h-full rounded-full ${emphasised ? 'bg-accent' : 'bg-ink-faint'}`}
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
          <p className="mt-4 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn-ink">
            {t('shoe.exhausted')}
          </p>
        )}
      </Panel>
    </div>
  );
}
