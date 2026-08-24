import { useGameStore } from '../store/useGameStore';
import type { Rules } from '../engine/types';

const DECK_OPTIONS = [1, 2, 6, 8];

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-emerald-400"
      />
      <span>
        <span className="text-sm text-slate-200">{label}</span>
        {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

function Segmented<T extends string | number>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <div className="text-sm text-slate-200">{label}</div>
      {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
      <div className="mt-2 inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              'rounded-md px-3 py-1 text-xs font-medium transition',
              option.value === value
                ? 'bg-emerald-400 text-emerald-950'
                : 'text-slate-400 hover:text-slate-100',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Réglages de la table. Chacun change réellement l'EV — c'est pourquoi ils sont
 * exposés plutôt que codés en dur.
 */
export function RulesPanel() {
  const shoe = useGameStore((s) => s.shoe);
  const rules = useGameStore((s) => s.rules);
  const setDecks = useGameStore((s) => s.setDecks);
  const setRules = useGameStore((s) => s.setRules);

  const update = (patch: Partial<Rules>) => setRules(patch);

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <Segmented
        label="Nombre de jeux"
        hint="Change de sabot et réinitialise le suivi."
        value={shoe.decks}
        options={DECK_OPTIONS.map((d) => ({ value: d, label: `${d}` }))}
        onChange={(decks) => {
          if (decks === shoe.decks) return;
          if (
            shoe.totalRemaining === shoe.decks * 52 ||
            confirm('Changer le nombre de jeux réinitialise le sabot. Continuer ?')
          ) {
            setDecks(decks);
          }
        }}
      />

      <Segmented
        label="Soft 17"
        hint="S17 : le croupier reste sur A+6. H17 : il tire."
        value={rules.soft17}
        options={[
          { value: 'S17', label: 'S17' },
          { value: 'H17', label: 'H17' },
        ]}
        onChange={(soft17) => update({ soft17 })}
      />

      <Segmented
        label="Double autorisé sur"
        value={rules.doubleOn}
        options={[
          { value: 'any', label: 'Tout' },
          { value: '9-11', label: '9–11' },
          { value: '10-11', label: '10–11' },
        ]}
        onChange={(doubleOn) => update({ doubleOn })}
      />

      <Segmented
        label="Paiement du blackjack"
        value={rules.blackjackPayout}
        options={[
          { value: 1.5, label: '3:2' },
          { value: 1.2, label: '6:5' },
        ]}
        onChange={(blackjackPayout) => update({ blackjackPayout })}
      />

      <div className="space-y-3">
        <Toggle
          label="Double après split (DAS)"
          checked={rules.doubleAfterSplit}
          onChange={(doubleAfterSplit) => update({ doubleAfterSplit })}
        />
        <Toggle
          label="Une seule carte sur les as splittés"
          checked={rules.oneCardAfterSplitAces}
          onChange={(oneCardAfterSplitAces) => update({ oneCardAfterSplitAces })}
        />
      </div>

      <div className="space-y-3">
        <Toggle
          label="Le croupier vérifie son blackjack (peek)"
          hint="Décoché : règle européenne, la mise initiale est perdue face à un blackjack."
          checked={rules.peek}
          onChange={(peek) => update({ peek })}
        />
        <Toggle
          label="Cascade du sabot entre les mains splittées"
          hint="Plus exact, nettement plus lent. L'écart typique est inférieur à 0,001."
          checked={rules.splitCascade}
          onChange={(splitCascade) => update({ splitCascade })}
        />
      </div>
    </div>
  );
}
