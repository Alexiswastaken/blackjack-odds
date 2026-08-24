import type { CardRank } from '../engine/types';

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

export const RANK_SUBLABEL: Partial<Record<CardRank, string>> = {
  T: 'J Q K',
  A: '1 / 11',
};

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)} %`;
}

/** Les EV sont signées : le signe explicite évite toute ambiguïté de lecture. */
export function formatEV(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(4)}`;
}
