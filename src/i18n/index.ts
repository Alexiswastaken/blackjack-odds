import { useGameStore } from '../store/useGameStore';
import { en } from './en';
import { fr, type TranslationKey } from './fr';

export type Language = 'fr' | 'en';

export const LANGUAGES: Language[] = ['fr', 'en'];

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { fr, en };

export type { TranslationKey };

export type TranslateParams = Record<string, string | number>;

/**
 * Remplace les jetons `{nom}` par leur valeur.
 *
 * Un jeton sans valeur correspondante est laissé tel quel : mieux vaut voir
 * `{count}` à l'écran qu'un trou silencieux dans une phrase.
 */
function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

export function translate(
  language: Language,
  key: TranslationKey,
  params?: TranslateParams,
): string {
  const dictionary = DICTIONARIES[language] ?? DICTIONARIES.fr;
  return interpolate(dictionary[key] ?? fr[key] ?? key, params);
}

/**
 * Forme plurielle. Les deux langues gérées distinguent uniquement « un » du
 * reste, ce qui rend une règle unique suffisante — pas besoin d'`Intl.PluralRules`.
 */
export function translatePlural(
  language: Language,
  baseKey: string,
  count: number,
  params?: TranslateParams,
): string {
  const suffix = Math.abs(count) === 1 ? '_one' : '_other';
  return translate(language, `${baseKey}${suffix}` as TranslationKey, { count, ...params });
}

export interface Translator {
  t: (key: TranslationKey, params?: TranslateParams) => string;
  plural: (baseKey: string, count: number, params?: TranslateParams) => string;
  language: Language;
}

/** Accès aux traductions depuis un composant. Re-rend au changement de langue. */
export function useT(): Translator {
  const language = useGameStore((s) => s.settings.language);
  return {
    language,
    t: (key, params) => translate(language, key, params),
    plural: (baseKey, count, params) => translatePlural(language, baseKey, count, params),
  };
}

/** Locale complète, pour `Intl.NumberFormat`. */
export function localeOf(language: Language): string {
  return language === 'fr' ? 'fr-FR' : 'en-US';
}
