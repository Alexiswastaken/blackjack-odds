import type { CardRank, Hand } from './types';

/** Valeur "dure" d'un rang : l'as compte 1, `T` compte 10. */
export function hardValue(rank: CardRank): number {
  if (rank === 'A') return 1;
  if (rank === 'T') return 10;
  return Number(rank);
}

export interface HandTotal {
  /** Meilleur total ne dépassant pas 21 lorsque c'est possible. */
  total: number;
  /** `true` si un as est encore compté 11 (le total peut être dégradé sans buster). */
  soft: boolean;
}

/**
 * Ajoute une carte à un total courant.
 *
 * Travailler en incrémental (plutôt que de recalculer depuis la liste de cartes)
 * évite d'allouer un tableau à chaque nœud des arbres de décision.
 */
export function addCardToTotal(total: number, soft: boolean, rank: CardRank): HandTotal {
  let newTotal: number;
  let newSoft = soft;

  if (rank === 'A') {
    newTotal = total + 11;
    if (newTotal > 21) {
      newTotal = total + 1;
    } else {
      newSoft = true;
    }
  } else {
    newTotal = total + hardValue(rank);
  }

  // Un as compté 11 est dégradé à 1 dès que le total dépasse 21.
  if (newTotal > 21 && newSoft) {
    newTotal -= 10;
    newSoft = false;
  }

  return { total: newTotal, soft: newSoft };
}

export function handTotal(cards: readonly CardRank[]): HandTotal {
  let total = 0;
  let soft = false;
  for (const card of cards) {
    const next = addCardToTotal(total, soft, card);
    total = next.total;
    soft = next.soft;
  }
  return { total, soft };
}

/** Un blackjack naturel : exactement 2 cartes à 21, et pas une main issue d'un split. */
export function isBlackjack(hand: Hand): boolean {
  return !hand.isSplit && hand.cards.length === 2 && handTotal(hand.cards).total === 21;
}

export function isPair(hand: Hand): boolean {
  return hand.cards.length === 2 && hand.cards[0] === hand.cards[1];
}

export function isBust(hand: Hand): boolean {
  return handTotal(hand.cards).total > 21;
}

/** Les deux cartes forment-elles un blackjack ? Utilisé pour la carte cachée du croupier. */
export function isNaturalPair(a: CardRank, b: CardRank): boolean {
  return (a === 'A' && b === 'T') || (a === 'T' && b === 'A');
}
