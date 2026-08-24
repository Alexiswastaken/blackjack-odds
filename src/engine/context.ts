import type { CacheStats, DealerOutcome, Rules } from './types';

/**
 * Contexte de calcul : règles + caches + compteurs.
 *
 * Le cache est indispensable, pas optionnel : les branches Hit, Double et Split
 * retombent en permanence sur les mêmes sous-états (même sabot restant, même
 * total). Sans mémoïsation, la simulation du croupier serait relancée des
 * dizaines de milliers de fois pour des états identiques.
 *
 * Les clés sont *canoniques* : elles ne dépendent que de la composition du sabot
 * (10 compteurs ordonnés), pas de l'ordre dans lequel les cartes sont sorties.
 */
export interface EngineContext {
  rules: Rules;
  /** Clé : `sabot|total|soft` — distribution des mains du croupier en cours. */
  dealerPlay: Map<string, Float64Array>;
  /** Clé : `sabot|carteVisible` — issue complète du croupier, blackjack compris. */
  dealerOutcome: Map<string, DealerOutcome>;
  /** Clé : `sabot|carteVisible|total|soft` — EV du meilleur jeu du joueur. */
  playerHit: Map<string, number>;
  hits: number;
  misses: number;
}

export function createContext(rules: Rules): EngineContext {
  return {
    rules,
    dealerPlay: new Map(),
    dealerOutcome: new Map(),
    playerHit: new Map(),
    hits: 0,
    misses: 0,
  };
}

export function cacheStats(ctx: EngineContext): CacheStats {
  return {
    hits: ctx.hits,
    misses: ctx.misses,
    size: ctx.dealerPlay.size + ctx.dealerOutcome.size + ctx.playerHit.size,
  };
}

/** Vide les caches — à appeler à chaque nouveau sabot (nouveau mélange). */
export function clearCaches(ctx: EngineContext): void {
  ctx.dealerPlay.clear();
  ctx.dealerOutcome.clear();
  ctx.playerHit.clear();
  ctx.hits = 0;
  ctx.misses = 0;
}
