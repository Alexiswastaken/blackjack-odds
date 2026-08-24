import { useT } from '../i18n';
import type { Rules } from '../engine/types';
import { MAX_DECKS, MIN_DECKS, fullShoeSize, useGameStore } from '../store/useGameStore';
import { Segmented, Toggle } from './ui';

const PRESET_DECKS = [1, 2, 4, 6, 8];

/**
 * Réglages de la table. Chacun change réellement l'EV — c'est pourquoi ils sont
 * exposés plutôt que codés en dur.
 */
export function RulesPanel() {
  const shoe = useGameStore((s) => s.shoe);
  const rules = useGameStore((s) => s.rules);
  const setDecks = useGameStore((s) => s.setDecks);
  const setRules = useGameStore((s) => s.setRules);
  const { t, plural } = useT();

  const update = (patch: Partial<Rules>) => setRules(patch);

  /** Le sabot n'est réinitialisé qu'après confirmation s'il est déjà entamé. */
  const changeDecks = (decks: number) => {
    if (decks === shoe.decks) return;
    const untouched = shoe.totalRemaining === fullShoeSize(shoe.decks);
    if (untouched || confirm(t('rules.decks.confirm'))) setDecks(decks);
  };

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <Segmented
          label={t('rules.decks')}
          hint={t('rules.decks.help')}
          value={PRESET_DECKS.includes(shoe.decks) ? shoe.decks : -1}
          options={[
            ...PRESET_DECKS.map((d) => ({ value: d, label: String(d) })),
            { value: -1, label: t('rules.decks.custom') },
          ]}
          onChange={(value) => {
            // « Autre » n'est pas un nombre de jeux : c'est le champ libre qui prend le relais.
            if (value !== -1) changeDecks(value);
          }}
        />
        <div className="mt-3 flex items-center gap-3">
          <input
            type="number"
            min={MIN_DECKS}
            max={MAX_DECKS}
            value={shoe.decks}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (Number.isFinite(value) && value >= MIN_DECKS && value <= MAX_DECKS) {
                changeDecks(value);
              }
            }}
            className="themed w-20 rounded-lg border border-line bg-raised px-2 py-1 text-sm text-ink tabular"
          />
          <span className="text-xs text-ink-subtle">
            {t('rules.decks.total', { cards: plural('unit.card', fullShoeSize(shoe.decks)) })}
          </span>
        </div>
      </div>

      <Segmented
        label={t('rules.soft17')}
        hint={t('rules.soft17.help')}
        value={rules.soft17}
        options={[
          { value: 'S17', label: 'S17' },
          { value: 'H17', label: 'H17' },
        ]}
        onChange={(soft17) => update({ soft17 })}
      />

      <Segmented
        label={t('rules.doubleOn')}
        value={rules.doubleOn}
        options={[
          { value: 'any', label: t('rules.doubleOn.any') },
          { value: '9-11', label: t('rules.doubleOn.9-11') },
          { value: '10-11', label: t('rules.doubleOn.10-11') },
        ]}
        onChange={(doubleOn) => update({ doubleOn })}
      />

      <Segmented
        label={t('rules.payout')}
        value={rules.blackjackPayout}
        options={[
          { value: 1.5, label: '3:2' },
          { value: 1.2, label: '6:5' },
        ]}
        onChange={(blackjackPayout) => update({ blackjackPayout })}
      />

      <div className="space-y-3">
        <Toggle
          label={t('rules.das')}
          checked={rules.doubleAfterSplit}
          onChange={(doubleAfterSplit) => update({ doubleAfterSplit })}
        />
        <Toggle
          label={t('rules.splitAces')}
          checked={rules.oneCardAfterSplitAces}
          onChange={(oneCardAfterSplitAces) => update({ oneCardAfterSplitAces })}
        />
      </div>

      <div className="space-y-3">
        <Toggle
          label={t('rules.peek')}
          hint={t('rules.peek.help')}
          checked={rules.peek}
          onChange={(peek) => update({ peek })}
        />
        <Toggle
          label={t('rules.cascade')}
          hint={t('rules.cascade.help')}
          checked={rules.splitCascade}
          onChange={(splitCascade) => update({ splitCascade })}
        />
      </div>
    </div>
  );
}
