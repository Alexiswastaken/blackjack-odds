/**
 * Types du moteur de probabilités.
 *
 * Ce module (et tout `src/engine/`) est volontairement 100 % découplé de React :
 * aucune fonction n'a d'effet de bord, ce qui les rend testables en isolation
 * et sûres à mémoïser.
 */

/** `T` regroupe 10, J, Q et K : ces quatre rangs sont indiscernables au blackjack. */
export type CardRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T';

/** Ordre canonique des rangs. Il fixe l'ordre des compteurs dans les clés de cache. */
export const RANKS: readonly CardRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T'];

export type Action = 'hit' | 'stand' | 'double' | 'split';

export interface ShoeState {
  /** Nombre de jeux au départ (1, 2, 6, 8...). */
  decks: number;
  /** Cartes restantes par valeur. */
  remaining: Record<CardRank, number>;
  totalRemaining: number;
}

export interface Hand {
  cards: CardRank[];
  /** `true` si la main est issue d'un split (interdit le blackjack naturel). */
  isSplit: boolean;
}

/** Règles de la table. Elles changent l'EV : elles ne sont jamais devinées silencieusement. */
export interface Rules {
  /** `S17` : le croupier reste sur soft 17. `H17` : il tire. */
  soft17: 'S17' | 'H17';
  /** Mains sur lesquelles le double est autorisé. */
  doubleOn: 'any' | '9-11' | '10-11';
  /** Double autorisé après un split (DAS). */
  doubleAfterSplit: boolean;
  /** Le croupier vérifie son blackjack avant que le joueur ne joue (règle US). */
  peek: boolean;
  /** Une seule carte est distribuée sur chaque as splitté, sans tirage ultérieur. */
  oneCardAfterSplitAces: boolean;
  /** Gain d'un blackjack naturel, en unités de mise (1.5 = 3:2, 1.2 = 6:5). */
  blackjackPayout: number;
  /**
   * Si `true`, la deuxième main d'un split est évaluée sur le sabot réellement
   * laissé par la première (cascade exacte, plus lent). Si `false`, les deux
   * mains sont évaluées sur le même sabot (2 × EV d'une main).
   */
  splitCascade: boolean;
}

export const DEFAULT_RULES: Rules = {
  soft17: 'S17',
  doubleOn: 'any',
  doubleAfterSplit: true,
  peek: true,
  oneCardAfterSplitAces: true,
  blackjackPayout: 1.5,
  splitCascade: true,
};

/**
 * Distribution exacte des totaux finaux du croupier, hors blackjack naturel.
 * Indices : 0→17, 1→18, 2→19, 3→20, 4→21, 5→bust.
 */
export type DealerDistribution = Float64Array;

export const DEALER_TOTALS = [17, 18, 19, 20, 21] as const;
export const DEALER_BUST_INDEX = 5;

export interface DealerOutcome {
  /** Probabilité que le croupier ait un blackjack naturel. */
  blackjack: number;
  /** Distribution des autres issues. `blackjack + somme(dist) === 1`. */
  dist: DealerDistribution;
}

export interface ActionEV {
  action: Action;
  ev: number;
  /** `false` si l'action est interdite par les règles ou l'état de la main. */
  available: boolean;
  /** Raison de l'indisponibilité, à afficher dans l'UI. */
  unavailableReason?: string;
}

export interface DecisionResult {
  playerTotal: number;
  playerSoft: boolean;
  isBlackjack: boolean;
  isBust: boolean;
  /** Probabilité exacte de dépasser 21 en tirant une carte. */
  bustProbabilityOnHit: number;
  /** Probabilité de blackjack du croupier, avant conditionnement. */
  dealerBlackjackProbability: number;
  /** Distribution des issues du croupier, conditionnée à l'absence de blackjack si `peek`. */
  dealerDistribution: number[];
  actions: ActionEV[];
  /** Action d'EV maximale parmi celles disponibles. */
  recommended: Action;
  cacheStats: CacheStats;
  computeTimeMs: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}
