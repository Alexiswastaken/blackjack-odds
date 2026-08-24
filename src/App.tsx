import { useState } from 'react';
import { DecisionView } from './components/DecisionView';
import { RulesPanel } from './components/RulesPanel';
import { ShoeMeter } from './components/ShoeMeter';
import { ShoeTracker } from './components/ShoeTracker';
import { useGameStore } from './store/useGameStore';

type Tab = 'shoe' | 'decision';

const TABS: { id: Tab; label: string }[] = [
  { id: 'shoe', label: 'Suivi du sabot' },
  { id: 'decision', label: 'Décision de jeu' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('shoe');
  const [showRules, setShowRules] = useState(false);
  const rules = useGameStore((s) => s.rules);
  const decks = useGameStore((s) => s.shoe.decks);

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-100">Blackjack Odds</h1>
          <p className="text-xs text-slate-500">
            Probabilités exactes sur le sabot réel · {decks} jeu{decks > 1 ? 'x' : ''} ·{' '}
            {rules.soft17} · {rules.doubleAfterSplit ? 'DAS' : 'sans DAS'}
          </p>
        </div>
        <ShoeMeter />
      </header>

      <nav className="mt-6 flex items-center gap-1 border-b border-white/10">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={[
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition',
              tab === item.id
                ? 'border-emerald-400 text-emerald-200'
                : 'border-transparent text-slate-400 hover:text-slate-200',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowRules((value) => !value)}
          className="-mb-px ml-auto border-b-2 border-transparent px-4 py-2.5 text-sm text-slate-400 transition hover:text-slate-200"
        >
          {showRules ? 'Masquer les règles' : 'Règles de la table'}
        </button>
      </nav>

      {showRules && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <RulesPanel />
        </div>
      )}

      <main className="mt-6 flex-1">
        {tab === 'shoe' ? <ShoeTracker /> : <DecisionView />}
      </main>

      <footer className="mt-10 border-t border-white/5 pt-4 text-[11px] leading-relaxed text-slate-600">
        Outil d'analyse personnel. Les cartes doivent être saisies manuellement&nbsp;: rien n'est
        connecté à une table de jeu. Le sabot est partagé entre les deux onglets et conservé
        localement dans ce navigateur.
      </footer>
    </div>
  );
}
