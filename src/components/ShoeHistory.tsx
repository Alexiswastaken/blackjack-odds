import { useState } from 'react';
import { fullShoeSize, useGameStore } from '../store/useGameStore';
import { useT } from '../i18n';
import { RANK_LABEL } from './cardLabels';
import { originLabel, originTone } from './originLabel';
import { Button, Hint, Panel, SectionTitle } from './ui';

const COLLAPSED_COUNT = 40;

/**
 * Mémoire du sabot : toutes les cartes vues depuis le mélange.
 *
 * C'est la contrepartie visible du calcul exact — ce que le moteur « sait »
 * réellement du sabot est ici, carte par carte, dans l'ordre de sortie.
 */
export function ShoeHistory() {
  const history = useGameStore((s) => s.history);
  const decks = useGameStore((s) => s.shoe.decks);
  const mySeat = useGameStore((s) => s.multi.mySeat);
  const translator = useT();
  const { t } = translator;
  const [expanded, setExpanded] = useState(false);

  const total = fullShoeSize(decks);
  // Plus récentes en tête : c'est l'ordre utile pour relire ou corriger.
  const ordered = [...history].reverse();
  const shown = expanded ? ordered : ordered.slice(0, COLLAPSED_COUNT);

  return (
    <Panel>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionTitle>{t('shoe.history.title')}</SectionTitle>
        <span className="tabular text-xs text-ink-subtle">
          {t('shoe.history.count', { count: history.length, total })}
        </span>
      </div>
      <Hint>{t('shoe.history.help')}</Hint>

      {history.length === 0 ? (
        <p className="mt-4 text-sm text-ink-subtle">{t('shoe.history.empty')}</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {shown.map((entry, index) => (
              <span
                key={`${entry.rank}-${index}`}
                title={originLabel(entry.origin, translator, mySeat)}
                className={[
                  'tabular rounded-md px-2 py-1 text-xs font-medium',
                  index === 0 ? 'ring-1 ring-accent' : '',
                  originTone(entry.origin, mySeat),
                ].join(' ')}
              >
                {RANK_LABEL[entry.rank]}
              </span>
            ))}
          </div>

          {ordered.length > COLLAPSED_COUNT && (
            <div className="mt-3">
              <Button onClick={() => setExpanded((value) => !value)}>
                {t(expanded ? 'shoe.history.collapse' : 'shoe.history.expand')}
              </Button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
