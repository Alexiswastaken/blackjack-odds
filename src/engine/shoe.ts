import { RANKS, type CardRank, type ShoeState } from './types';

/**
 * Représentation interne compacte du sabot : 10 compteurs dans l'ordre de `RANKS`.
 * Les fonctions de calcul l'utilisent pour éviter d'allouer des objets à chaque
 * nœud de récursion, et parce qu'elle produit directement la clé de cache.
 */
export type Counts = readonly number[];

export const RANK_INDEX: Record<CardRank, number> = RANKS.reduce(
  (acc, rank, i) => {
    acc[rank] = i;
    return acc;
  },
  {} as Record<CardRank, number>,
);

/** Nombre de cartes par rang dans un jeu de 52 : 4 partout, 16 pour `T` (10/J/Q/K). */
export function cardsPerDeck(rank: CardRank): number {
  return rank === 'T' ? 16 : 4;
}

export function createShoe(decks: number): ShoeState {
  if (!Number.isInteger(decks) || decks < 1) {
    throw new Error(`Nombre de jeux invalide : ${decks}`);
  }
  const remaining = {} as Record<CardRank, number>;
  let total = 0;
  for (const rank of RANKS) {
    const count = cardsPerDeck(rank) * decks;
    remaining[rank] = count;
    total += count;
  }
  return { decks, remaining, totalRemaining: total };
}

export function toCounts(shoe: ShoeState): number[] {
  return RANKS.map((rank) => shoe.remaining[rank]);
}

export function fromCounts(counts: Counts, decks: number): ShoeState {
  const remaining = {} as Record<CardRank, number>;
  let total = 0;
  RANKS.forEach((rank, i) => {
    remaining[rank] = counts[i];
    total += counts[i];
  });
  return { decks, remaining, totalRemaining: total };
}

export function countsTotal(counts: Counts): number {
  let total = 0;
  for (let i = 0; i < counts.length; i++) total += counts[i];
  return total;
}

/** Retire une carte et renvoie un nouveau tableau (les compteurs restent immuables). */
export function removeCard(counts: Counts, index: number): number[] {
  const next = counts.slice();
  next[index] -= 1;
  return next;
}

/**
 * Clé canonique d'un sabot : les 10 compteurs dans l'ordre de `RANKS`.
 * Deux sabots identiques produisent la même clé quel que soit l'ordre dans
 * lequel les cartes sont sorties — c'est ce qui rend le cache efficace.
 */
export function countsKey(counts: Counts): string {
  return counts.join(',');
}

/** Probabilité exacte que la prochaine carte soit de rang `rank` : `R_v / R`. */
export function probabilityOfNext(shoe: ShoeState, rank: CardRank): number {
  if (shoe.totalRemaining === 0) return 0;
  return shoe.remaining[rank] / shoe.totalRemaining;
}

/** Probabilité de sortie de chaque rang, pour l'affichage du suivi de sabot. */
export function nextCardProbabilities(shoe: ShoeState): Record<CardRank, number> {
  const out = {} as Record<CardRank, number>;
  for (const rank of RANKS) out[rank] = probabilityOfNext(shoe, rank);
  return out;
}

/** Retire une carte du sabot public. Lève si la carte n'est plus disponible. */
export function drawFromShoe(shoe: ShoeState, rank: CardRank): ShoeState {
  if (shoe.remaining[rank] <= 0) {
    throw new Error(`Plus aucune carte "${rank}" dans le sabot.`);
  }
  return {
    decks: shoe.decks,
    remaining: { ...shoe.remaining, [rank]: shoe.remaining[rank] - 1 },
    totalRemaining: shoe.totalRemaining - 1,
  };
}

/** Remet une carte dans le sabot (undo). Lève si le sabot serait sur-rempli. */
export function returnToShoe(shoe: ShoeState, rank: CardRank): ShoeState {
  const max = cardsPerDeck(rank) * shoe.decks;
  if (shoe.remaining[rank] >= max) {
    throw new Error(`Le sabot contient déjà les ${max} cartes "${rank}".`);
  }
  return {
    decks: shoe.decks,
    remaining: { ...shoe.remaining, [rank]: shoe.remaining[rank] + 1 },
    totalRemaining: shoe.totalRemaining + 1,
  };
}
