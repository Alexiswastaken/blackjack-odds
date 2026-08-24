import { useT } from '../i18n';
import { useUpdater } from '../hooks/useUpdater';
import { useGameStore, type Language, type ThemeChoice } from '../store/useGameStore';
import { formatPercent } from './cardLabels';
import { Button, Hint, Panel, SectionTitle, Segmented } from './ui';

function UpdateSection() {
  const { t, language } = useT();
  const updater = useUpdater();

  if (!updater.available) {
    return (
      <Panel>
        <SectionTitle>{t('settings.updates.title')}</SectionTitle>
        <Hint>{t('settings.updates.webOnly')}</Hint>
      </Panel>
    );
  }

  const macManual = updater.stage === 'available' && !updater.canAutoInstall;

  return (
    <Panel>
      <SectionTitle>{t('settings.updates.title')}</SectionTitle>
      {updater.appVersion && (
        <Hint>{t('settings.updates.current', { version: updater.appVersion })}</Hint>
      )}

      <div className="mt-4 space-y-3">
        {updater.stage === 'up-to-date' && (
          <p className="text-sm text-accent-ink">{t('settings.updates.upToDate')}</p>
        )}

        {updater.stage === 'available' && updater.version && (
          <p className="text-sm text-ink">
            {t('settings.updates.available', { version: updater.version })}
          </p>
        )}

        {macManual && (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn-ink">
            {t('settings.updates.macUnsigned')}
          </p>
        )}

        {updater.stage === 'downloading' && (
          <div>
            <p className="text-sm text-ink">
              {t('settings.updates.downloading', {
                percent: formatPercent(updater.progress, language, 0),
              })}
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-track">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${updater.progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {updater.stage === 'ready' && updater.version && (
          <p className="text-sm text-accent-ink">
            {t('settings.updates.ready', { version: updater.version })}
          </p>
        )}

        {updater.stage === 'error' && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger-ink">
            {t('settings.updates.error', { message: updater.message ?? '' })}
          </p>
        )}

        {updater.stage === 'unsupported' && (
          <p className="text-xs text-ink-subtle">{t('settings.updates.webOnly')}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void updater.check()} disabled={updater.stage === 'checking'}>
            {t(updater.stage === 'checking' ? 'settings.updates.checking' : 'settings.updates.check')}
          </Button>

          {updater.stage === 'available' && updater.canAutoInstall && (
            <Button variant="accent" onClick={() => void updater.download()}>
              {t('settings.updates.download')}
            </Button>
          )}

          {updater.stage === 'ready' && (
            <Button variant="accent" onClick={updater.install}>
              {t('settings.updates.restart')}
            </Button>
          )}

          {(macManual || updater.stage === 'manual' || updater.stage === 'error') && (
            <Button onClick={updater.openReleases}>{t('settings.updates.openReleases')}</Button>
          )}
        </div>
      </div>
    </Panel>
  );
}

export function SettingsView() {
  const { t } = useT();
  const settings = useGameStore((s) => s.settings);
  const setLanguage = useGameStore((s) => s.setLanguage);
  const setTheme = useGameStore((s) => s.setTheme);
  const resetAll = useGameStore((s) => s.resetAll);

  return (
    <div className="grid max-w-3xl gap-4">
      <Panel>
        <SectionTitle>{t('settings.appearance')}</SectionTitle>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Segmented<Language>
            label={t('settings.language')}
            value={settings.language}
            options={[
              { value: 'fr', label: t('settings.language.fr') },
              { value: 'en', label: t('settings.language.en') },
            ]}
            onChange={setLanguage}
          />
          <Segmented<ThemeChoice>
            label={t('settings.theme')}
            hint={t('settings.theme.help')}
            value={settings.theme}
            options={[
              { value: 'dark', label: t('settings.theme.dark') },
              { value: 'light', label: t('settings.theme.light') },
              { value: 'system', label: t('settings.theme.system') },
            ]}
            onChange={setTheme}
          />
        </div>
      </Panel>

      <UpdateSection />

      <Panel>
        <SectionTitle>{t('settings.data.title')}</SectionTitle>
        <Hint>{t('settings.data.help')}</Hint>
        <div className="mt-4">
          <Button
            onClick={() => {
              if (confirm(t('settings.data.resetConfirm'))) resetAll();
            }}
          >
            {t('settings.data.reset')}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
