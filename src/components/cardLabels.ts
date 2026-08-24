import type { CardRank } from '../engine/types';
import { localeOf, type Language } from '../i18n';

/** Libellé affiché pour chaque rang. `T` couvre les quatre figures à 10. */
export const RANK_LABEL: Record<CardRank, string> = {
  A: 'A',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  T: '10',
};

export function formatPercent(value: number, language: Language, digits = 1): string {
  return new Intl.NumberFormat(localeOf(language), {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Les EV sont signées : le signe explicite évite toute ambiguïté de lecture. */
export function formatEV(value: number, language: Language): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(localeOf(language), {
    signDisplay: 'always',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(localeOf(language)).format(value);
}
