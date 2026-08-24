import { useState } from 'react';
import { DecisionView } from './components/DecisionView';
import { MultiDecisionView } from './components/MultiDecisionView';
import { RulesPanel } from './components/RulesPanel';
import { SettingsView } from './components/SettingsView';
import { ShoeMeter } from './components/ShoeMeter';
import { ShoeTracker } from './components/ShoeTracker';
import { useAppChrome } from './hooks/useTheme';
import { useT, type TranslationKey } from './i18n';
import { useGameStore } from './store/useGameStore';

type Tab = 'shoe' | 'decision' | 'multi' | 'settings';

const TABS: { id: Tab; label: TranslationKey }[] = [
  { id: 'shoe', label: 'nav.shoe' },
  { id: 'decision', label: 'nav.decision' },
  { id: 'multi', label: 'nav.multi' },
  { id: 'settings', label: 'nav.settings' },
];

export default function App() {
  useAppChrome();

  const [tab, setTab] = useState<Tab>('shoe');
  const [showRules, setShowRules] = useState(false);
  const rules = useGameStore((s) => s.rules);
  const decks = useGameStore((s) => s.shoe.decks);
  const { t, plural } = useT();

  return (
    <div className="themed mx-auto flex min-h-full max-w-6xl flex-col px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">{t('app.name')}</h1>
          <p className="text-xs text-ink-subtle">
            {t('app.subtitle', {
              decks: plural('unit.deck', decks),
              soft17: rules.soft17,
              das: t(rules.doubleAfterSplit ? 'app.das.on' : 'app.das.off'),
            })}
          </p>
        </div>
        <ShoeMeter />
      </header>

      <nav className="mt-6 flex flex-wrap items-center gap-1 border-b border-line">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={[
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition',
              tab === item.id
                ? 'border-accent text-accent-ink'
                : 'border-transparent text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {t(item.label)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowRules((value) => !value)}
          className="-mb-px ml-auto border-b-2 border-transparent px-4 py-2.5 text-sm text-ink-muted transition hover:text-ink"
        >
          {t(showRules ? 'nav.rules.hide' : 'nav.rules.show')}
        </button>
      </nav>

      {showRules && (
        <div className="themed mt-5 rounded-2xl border border-line bg-surface p-5">
          <RulesPanel />
        </div>
      )}

      <main className="mt-6 flex-1">
        {tab === 'shoe' && <ShoeTracker />}
        {tab === 'decision' && <DecisionView />}
        {tab === 'multi' && <MultiDecisionView />}
        {tab === 'settings' && <SettingsView />}
      </main>

      <footer className="mt-10 border-t border-line pt-4 text-[11px] leading-relaxed text-ink-faint">
        {t('app.footer')}
      </footer>
    </div>
  );
}
