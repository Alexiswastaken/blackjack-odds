import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

/**
 * Applique le thème et la langue au document.
 *
 * Le thème « système » est résolu en JavaScript plutôt que par une media query
 * CSS : la palette est définie une seule fois sur `[data-theme]`, ce qui évite
 * de dupliquer chaque variable dans un bloc `prefers-color-scheme`.
 */
export function useAppChrome(): void {
  const theme = useGameStore((s) => s.settings.theme);
  const language = useGameStore((s) => s.settings.language);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');

    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = resolved;
    };

    apply();
    if (theme !== 'system') return;

    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
}
