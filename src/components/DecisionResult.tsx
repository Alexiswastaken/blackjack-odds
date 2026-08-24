import type { Action, ActionEV, Outcome, UnavailableReason } from '../engine/types';
import type { DecisionState } from '../hooks/useDecision';
import { useT, type Translator } from '../i18n';
import { formatEV, formatNumber, formatPercent } from './cardLabels';
import { Panel, SectionTitle } from './ui';

const ACTION_KEY: Record<Action, 'action.hit' | 'action.stand' | 'action.double' | 'action.split'> =
  {
    hit: 'action.hit',
    stand: 'action.stand',
    double: 'action.double',
    split: 'action.split',
  };

const DEALER_TOTAL_LABELS = ['17', '18', '19', '20', '21'];

function reasonText(reason: UnavailableReason | undefined, { t }: Translator): string {
  if (!reason) return '';
  if (reason.code === 'doubleLimited') {
    return t('action.unavailable.doubleLimited', { rule: reason.rule });
  }
  return t(`action.unavailable.${reason.code}` as const);
}

/**
 * Répartition gain / égalité / perte.
 *
 * Affichée à côté de l'EV parce que les deux ne disent pas la même chose : une
 * action peut rapporter davantage sans gagner plus souvent.
 */
function OutcomeStrip({ outcome, translator }: { outcome: Outcome; translator: Translator }) {
  const { t, language } = translator;
  const parts = [
    { value: outcome.win, className: 'bg-accent' },
    { value: outcome.push, className: 'bg-ink-faint' },
    { value: outcome.lose, className: 'bg-danger' },
  ];

  return (
    <div className="mt-2">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-track">
        {parts.map((part, index) => (
          <div
            key={index}
            className={part.className}
            style={{ width: `${Math.max(0, part.value) * 100}%` }}
          />
        ))}
      </div>
      <div className="tabular mt-1 text-[11px] text-ink-subtle">
        {t('outcome.summary', {
          win: formatPercent(outcome.win, language, 1),
          push: formatPercent(outcome.push, language, 1),
          lose: formatPercent(outcome.lose, language, 1),
        })}
      </div>
    </div>
  );
}

function EVRow({
  action,
  best,
  translator,
}: {
  action: ActionEV;
  best: number;
  translator: Translator;
}) {
  const { t, language } = translator;
  const isBest = action.available && action.ev === best;
  // Les EV vivent dans [-2, +2] (le double met deux unités en jeu) : une barre
  // centrée sur zéro rend le signe lisible d'un coup d'œil.
  const magnitude = Math.min(Math.abs(action.ev) / 2, 1) * 50;

  return (
    <div
      className={[
        'themed rounded-xl border px-3 py-2.5 transition',
        isBest
          ? 'border-accent-line bg-accent-soft'
          : action.available
            ? 'border-line bg-surface'
            : 'border-line bg-surface opacity-50',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-sm font-medium ${isBest ? 'text-accent-ink' : 'text-ink'}`}>
          {t(ACTION_KEY[action.action])}
          {isBest && (
            <span className="ml-2 text-[10px] tracking-wider uppercase">
              {t('action.recommendedTag')}
            </span>
          )}
        </span>
        <span className="tabular text-sm text-ink-muted">
          {action.available ? formatEV(action.ev, language) : '—'}
        </span>
      </div>

      {action.available ? (
        <>
          <div className="relative mt-2 h-1.5 w-full rounded-full bg-track">
            <div className="absolute top-0 left-1/2 h-full w-px bg-line-strong" />
            <div
              className={`absolute top-0 h-full rounded-full ${action.ev >= 0 ? 'bg-accent' : 'bg-danger'}`}
              style={
                action.ev >= 0
                  ? { left: '50%', width: `${magnitude}%` }
                  : { right: '50%', width: `${magnitude}%` }
              }
            />
          </div>
          <OutcomeStrip outcome={action.outcome} translator={translator} />
        </>
      ) : (
        <div className="mt-1 text-[11px] text-ink-subtle">
          {reasonText(action.unavailableReason, translator)}
        </div>
      )}
    </div>
  );
}

/** Panneau de résultats, partagé par la vue solo et la vue multi-joueurs. */
export function DecisionResultPanel({
  state,
  incompleteMessage,
}: {
  state: DecisionState;
  incompleteMessage: string;
}) {
  const translator = useT();
  const { t, language } = translator;
  const { status, result, error } = state;

  if (status === 'incomplete') {
    return (
      <Panel className="p-6">
        <p className="text-sm text-ink-muted">{incompleteMessage}</p>
      </Panel>
    );
  }

  if (status === 'error') {
    return (
      <div className="themed rounded-2xl border border-danger bg-danger-soft p-6 text-sm text-danger-ink">
        {t('decision.error', { message: error ?? '' })}
      </div>
    );
  }

  if (!result) return null;

  const bestEV = Math.max(...result.actions.filter((a) => a.available).map((a) => a.ev));
  const outcomeLabels = [...DEALER_TOTAL_LABELS, t('decision.outcome.bust')];

  return (
    <div className="space-y-4">
      <div
        className={[
          'themed rounded-2xl border p-5 transition',
          status === 'computing'
            ? 'border-line bg-surface opacity-60'
            : 'border-accent-line bg-accent-soft',
        ].join(' ')}
      >
        <div className="text-[11px] tracking-wider text-accent-ink uppercase">
          {t(status === 'computing' ? 'decision.computing' : 'decision.recommended')}
        </div>
        <div className="mt-1 text-3xl font-semibold text-accent-ink">
          {result.isBlackjack ? t('decision.blackjack') : t(ACTION_KEY[result.recommended])}
        </div>
        <div className="tabular mt-2 text-sm text-ink-muted">
          {t('decision.summary', {
            total: result.playerTotal,
            soft: result.playerSoft ? ` ${t('decision.soft')}` : '',
            ev: formatEV(bestEV, language),
          })}
        </div>
      </div>

      <div className="grid gap-2">
        {result.actions.map((action) => (
          <EVRow key={action.action} action={action} best={bestEV} translator={translator} />
        ))}
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-ink-faint">{t('outcome.evNote')}</p>

      {result.actions.some((a) => a.action === 'split' && a.available) && (
        <p className="px-1 text-[11px] leading-relaxed text-ink-faint">{t('outcome.splitNote')}</p>
      )}

      <Panel>
        <SectionTitle>{t('decision.bust.title')}</SectionTitle>
        <div className="tabular mt-1 text-2xl font-semibold text-ink">
          {formatPercent(result.bustProbabilityOnHit, language, 2)}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-track">
          <div
            className="h-full rounded-full bg-danger transition-[width] duration-300"
            style={{ width: `${result.bustProbabilityOnHit * 100}%` }}
          />
        </div>
      </Panel>

      <Panel>
        <SectionTitle>{t('decision.dealerOutcomes.title')}</SectionTitle>
        <p className="mt-1 text-[11px] text-ink-subtle">
          {t('decision.dealerOutcomes.help', {
            probability: formatPercent(result.dealerBlackjackProbability, language, 2),
          })}
        </p>
        <div className="mt-3 space-y-1.5">
          {result.dealerDistribution.map((p, index) => (
            <div key={outcomeLabels[index]} className="flex items-center gap-3">
              <span className="w-10 text-xs text-ink-muted">{outcomeLabels[index]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-track">
                <div
                  className={`h-full rounded-full ${index === 5 ? 'bg-accent' : 'bg-ink-faint'}`}
                  style={{ width: `${p * 100}%` }}
                />
              </div>
              <span className="tabular w-16 text-right text-xs text-ink-muted">
                {formatPercent(p, language, 2)}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <details className="themed rounded-2xl border border-line bg-surface p-4 text-xs text-ink-muted">
        <summary className="cursor-pointer text-ink">{t('decision.debug.title')}</summary>
        <dl className="tabular mt-3 grid grid-cols-2 gap-y-1">
          <dt>{t('decision.debug.hits')}</dt>
          <dd className="text-right text-ink">{formatNumber(result.cacheStats.hits, language)}</dd>
          <dt>{t('decision.debug.misses')}</dt>
          <dd className="text-right text-ink">
            {formatNumber(result.cacheStats.misses, language)}
          </dd>
          <dt>{t('decision.debug.ratio')}</dt>
          <dd className="text-right text-ink">
            {formatPercent(
              result.cacheStats.hits /
                Math.max(1, result.cacheStats.hits + result.cacheStats.misses),
              language,
              1,
            )}
          </dd>
          <dt>{t('decision.debug.states')}</dt>
          <dd className="text-right text-ink">{formatNumber(result.cacheStats.size, language)}</dd>
          <dt>{t('decision.debug.time')}</dt>
          <dd className="text-right text-ink">{result.computeTimeMs} ms</dd>
        </dl>
      </details>
    </div>
  );
}
