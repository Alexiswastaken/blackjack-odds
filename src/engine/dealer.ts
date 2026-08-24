import type { EngineContext } from './context';
import { addCardToTotal } from './hand';
import { countsKey, removeCard, countsTotal, type Counts } from './shoe';
import { RANKS, DEALER_BUST_INDEX, type CardRank, type DealerDistribution, type DealerOutcome, type Rules } from './types';

const DIST_SIZE = 6;

function emptyDist(): Float64Array {
  return new Float64Array(DIST_SIZE);
}

/** Le croupier s'arrête-t-il sur ce total ? Dépend de la règle S17 / H17. */
export function dealerStands(total: number, soft: boolean, rules: Rules): boolean {
  if (total > 21) return true;
  if (total > 17) return true;
  if (total < 17) return false;
  // total === 17 : seul le soft 17 distingue S17 de H17.
  return rules.soft17 === 'S17' || !soft;
}

/**
 * Distribution exacte des totaux finaux du croupier à partir d'une main en cours.
 *
 * Récursion sur chaque carte possible, pondérée par sa probabilité exacte dans
 * le sabot restant (`R_v / R`), sans remise.
 */
export function dealerPlayFrom(
  total: number,
  soft: boolean,
  counts: Counts,
  ctx: EngineContext,
): DealerDistribution {
  if (total > 21) {
    const dist = emptyDist();
    dist[DEALER_BUST_INDEX] = 1;
    return dist;
  }

  const remaining = countsTotal(counts);

  if (dealerStands(total, soft, ctx.rules) || remaining === 0) {
    const dist = emptyDist();
    // Un sabot vide est un cas dégénéré : on fige la main sur son total courant.
    dist[Math.max(0, Math.min(4, total - 17))] = 1;
    return dist;
  }

  const key = `${countsKey(counts)}|${total}|${soft ? 's' : 'h'}`;
  const cached = ctx.dealerPlay.get(key);
  if (cached) {
    ctx.hits++;
    return cached;
  }
  ctx.misses++;

  const acc = emptyDist();
  for (let i = 0; i < RANKS.length; i++) {
    const count = counts[i];
    if (count === 0) continue;
    const p = count / remaining;
    const next = addCardToTotal(total, soft, RANKS[i]);
    const sub = dealerPlayFrom(next.total, next.soft, removeCard(counts, i), ctx);
    for (let j = 0; j < DIST_SIZE; j++) acc[j] += p * sub[j];
  }

  ctx.dealerPlay.set(key, acc);
  return acc;
}

/**
 * Issue complète du croupier à partir de sa carte visible et du sabot restant.
 *
 * La carte cachée est tirée du sabot restant. Le blackjack naturel est isolé
 * dans `blackjack` car il ne se compare pas comme un simple total de 21 :
 * il bat toutes les mains sauf un autre blackjack.
 */
export function dealerOutcome(
  upcard: CardRank,
  counts: Counts,
  ctx: EngineContext,
): DealerOutcome {
  const key = `${countsKey(counts)}|${upcard}`;
  const cached = ctx.dealerOutcome.get(key);
  if (cached) {
    ctx.hits++;
    return cached;
  }
  ctx.misses++;

  const remaining = countsTotal(counts);
  const acc = emptyDist();
  let blackjack = 0;

  if (remaining === 0) {
    const result: DealerOutcome = { blackjack: 0, dist: acc };
    ctx.dealerOutcome.set(key, result);
    return result;
  }

  const up = addCardToTotal(0, false, upcard);

  for (let i = 0; i < RANKS.length; i++) {
    const count = counts[i];
    if (count === 0) continue;
    const hole = RANKS[i];
    const p = count / remaining;

    const isNatural =
      (upcard === 'A' && hole === 'T') || (upcard === 'T' && hole === 'A');
    if (isNatural) {
      blackjack += p;
      continue;
    }

    const next = addCardToTotal(up.total, up.soft, hole);
    const sub = dealerPlayFrom(next.total, next.soft, removeCard(counts, i), ctx);
    for (let j = 0; j < DIST_SIZE; j++) acc[j] += p * sub[j];
  }

  const result: DealerOutcome = { blackjack, dist: acc };
  ctx.dealerOutcome.set(key, result);
  return result;
}

/**
 * Distribution conditionnée à l'absence de blackjack du croupier.
 *
 * C'est la distribution pertinente pour décider : quand le croupier vérifie sa
 * main (règle US, `peek`), le joueur ne prend jamais de décision face à un
 * blackjack — la main est déjà résolue. Sans ce conditionnement, les
 * recommandations face à un As ou un 10 seraient faussées.
 */
export function conditionalDealerDistribution(
  upcard: CardRank,
  counts: Counts,
  ctx: EngineContext,
): DealerDistribution {
  const outcome = dealerOutcome(upcard, counts, ctx);
  if (outcome.blackjack === 0) return outcome.dist;

  const scale = 1 / (1 - outcome.blackjack);
  const out = emptyDist();
  for (let j = 0; j < DIST_SIZE; j++) out[j] = outcome.dist[j] * scale;
  return out;
}
