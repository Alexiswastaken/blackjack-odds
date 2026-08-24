import type { EngineContext } from './context';
import { dealerOutcome } from './dealer';
import { doubleAllowedByRules, doubleEV, hitEV, standEV } from './ev';
import { addCardToTotal } from './hand';
import { countsKey, countsTotal, removeCard, type Counts } from './shoe';
import { DEALER_BUST_INDEX, RANKS, type CardRank, type Outcome } from './types';

/**
 * Probabilités de gain, d'égalité et de perte — à distinguer de l'EV.
 *
 * L'EV mesure ce que rapporte une action, ces probabilités mesurent à quelle
 * fréquence elle gagne. Les deux divergent dès que la mise change : doubler sur
 * 11 rapporte bien plus que rester sans gagner beaucoup plus souvent.
 *
 * Les décisions internes restent prises sur l'EV (c'est elle qui définit le jeu
 * optimal) ; ce module ne fait que propager les issues le long de la branche
 * choisie. En cas d'égalité stricte d'EV, on retient « rester » : le choix doit
 * être déterministe pour que deux exécutions donnent le même résultat.
 */

export const CERTAIN_LOSS: Outcome = { win: 0, push: 0, lose: 1 };

function accumulate(target: { win: number; push: number; lose: number }, p: number, o: Outcome) {
  target.win += p * o.win;
  target.push += p * o.push;
  target.lose += p * o.lose;
}

/** Issues de « rester », lues directement dans la distribution du croupier. */
export function standOutcome(
  total: number,
  upcard: CardRank,
  counts: Counts,
  ctx: EngineContext,
): Outcome {
  if (total > 21) return CERTAIN_LOSS;

  const { blackjack, dist } = dealerOutcome(upcard, counts, ctx);
  const norm = 1 - blackjack;
  if (norm <= 0) return { win: 0, push: 1, lose: 0 };

  let win = dist[DEALER_BUST_INDEX];
  let push = 0;
  let lose = 0;

  for (let i = 0; i < 5; i++) {
    const dealerTotal = 17 + i;
    if (total > dealerTotal) win += dist[i];
    else if (total < dealerTotal) lose += dist[i];
    else push += dist[i];
  }

  return { win: win / norm, push: push / norm, lose: lose / norm };
}

/** Issues de « tirer », puis de jouer optimalement. */
export function hitOutcome(
  total: number,
  soft: boolean,
  upcard: CardRank,
  counts: Counts,
  ctx: EngineContext,
): Outcome {
  const remaining = countsTotal(counts);
  if (remaining === 0) return standOutcome(total, upcard, counts, ctx);

  const key = `${countsKey(counts)}|${upcard}|${total}|${soft ? 's' : 'h'}`;
  const cached = ctx.playerHitOutcome.get(key);
  if (cached) {
    ctx.hits++;
    return cached;
  }
  ctx.misses++;

  const acc = { win: 0, push: 0, lose: 0 };

  for (let i = 0; i < RANKS.length; i++) {
    const count = counts[i];
    if (count === 0) continue;
    const p = count / remaining;
    const next = addCardToTotal(total, soft, RANKS[i]);

    if (next.total > 21) {
      acc.lose += p;
      continue;
    }

    const nextCounts = removeCard(counts, i);
    const keepHitting =
      hitEV(next.total, next.soft, upcard, nextCounts, ctx) >
      standEV(next.total, upcard, nextCounts, ctx);

    accumulate(
      acc,
      p,
      keepHitting
        ? hitOutcome(next.total, next.soft, upcard, nextCounts, ctx)
        : standOutcome(next.total, upcard, nextCounts, ctx),
    );
  }

  ctx.playerHitOutcome.set(key, acc);
  return acc;
}

/** Issues de « doubler » : une seule carte, puis arrêt forcé. */
export function doubleOutcome(
  total: number,
  soft: boolean,
  upcard: CardRank,
  counts: Counts,
  ctx: EngineContext,
): Outcome {
  const remaining = countsTotal(counts);
  if (remaining === 0) return standOutcome(total, upcard, counts, ctx);

  const acc = { win: 0, push: 0, lose: 0 };

  for (let i = 0; i < RANKS.length; i++) {
    const count = counts[i];
    if (count === 0) continue;
    const p = count / remaining;
    const next = addCardToTotal(total, soft, RANKS[i]);

    if (next.total > 21) {
      acc.lose += p;
      continue;
    }
    accumulate(acc, p, standOutcome(next.total, upcard, removeCard(counts, i), ctx));
  }

  return acc;
}

/**
 * Issues d'*une* des deux mains d'un split.
 *
 * Les deux mains se règlent séparément : l'une peut gagner pendant que l'autre
 * perd. Parler d'une probabilité de gain « du split » n'aurait donc pas de sens ;
 * ce qui est renvoyé ici est le sort d'une main prise au hasard parmi les deux.
 */
export function splitOutcome(
  pairRank: CardRank,
  upcard: CardRank,
  counts: Counts,
  ctx: EngineContext,
): Outcome {
  const remaining = countsTotal(counts);
  if (remaining === 0) return { win: 0, push: 1, lose: 0 };

  const base = addCardToTotal(0, false, pairRank);
  const acesOneCard = pairRank === 'A' && ctx.rules.oneCardAfterSplitAces;
  const acc = { win: 0, push: 0, lose: 0 };

  for (let i = 0; i < RANKS.length; i++) {
    const count = counts[i];
    if (count === 0) continue;
    const p = count / remaining;
    const next = addCardToTotal(base.total, base.soft, RANKS[i]);
    const nextCounts = removeCard(counts, i);

    if (acesOneCard) {
      accumulate(acc, p, standOutcome(next.total, upcard, nextCounts, ctx));
      continue;
    }

    const stand = standEV(next.total, upcard, nextCounts, ctx);
    const hit = hitEV(next.total, next.soft, upcard, nextCounts, ctx);
    let best = Math.max(stand, hit);
    let outcome =
      hit > stand
        ? hitOutcome(next.total, next.soft, upcard, nextCounts, ctx)
        : standOutcome(next.total, upcard, nextCounts, ctx);

    if (ctx.rules.doubleAfterSplit && doubleAllowedByRules(next.total, next.soft, ctx)) {
      const dbl = doubleEV(next.total, next.soft, upcard, nextCounts, ctx);
      if (dbl > best) {
        best = dbl;
        outcome = doubleOutcome(next.total, next.soft, upcard, nextCounts, ctx);
      }
    }

    accumulate(acc, p, outcome);
  }

  return acc;
}
