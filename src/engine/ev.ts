import type { EngineContext } from './context';
import { conditionalDealerDistribution, dealerOutcome } from './dealer';
import { addCardToTotal, handTotal, isBlackjack, isPair } from './hand';
import { countsKey, countsTotal, removeCard, toCounts, type Counts } from './shoe';
import {
  RANKS,
  DEALER_BUST_INDEX,
  type Action,
  type ActionEV,
  type CardRank,
  type DecisionResult,
  type Hand,
  type ShoeState,
  type UnavailableReason,
} from './types';
import { cacheStats } from './context';

/**
 * EV de rester, contre la distribution du croupier calculée sur le sabot *au
 * moment où le joueur s'arrête* (donc privé des cartes qu'il vient de tirer).
 *
 * La distribution est conditionnée à l'absence de blackjack du croupier : cette
 * main-là n'aurait jamais donné lieu à une décision.
 */
export function standEV(total: number, upcard: CardRank, counts: Counts, ctx: EngineContext): number {
  if (total > 21) return -1;

  const outcome = dealerOutcome(upcard, counts, ctx);
  const norm = 1 - outcome.blackjack;
  if (norm <= 0) return 0;

  const dist = outcome.dist;
  let ev = dist[DEALER_BUST_INDEX];
  for (let i = 0; i < 5; i++) {
    const dealerTotal = 17 + i;
    if (total > dealerTotal) ev += dist[i];
    else if (total < dealerTotal) ev -= dist[i];
  }
  return ev / norm;
}

/**
 * EV de tirer une carte puis de jouer optimalement (rester ou re-tirer).
 *
 * C'est le cœur récursif : chaque carte possible est pondérée par sa probabilité
 * exacte dans le sabot restant, et le sabot est décrémenté en cascade.
 */
export function hitEV(
  total: number,
  soft: boolean,
  upcard: CardRank,
  counts: Counts,
  ctx: EngineContext,
): number {
  const remaining = countsTotal(counts);
  if (remaining === 0) return standEV(total, upcard, counts, ctx);

  const key = `${countsKey(counts)}|${upcard}|${total}|${soft ? 's' : 'h'}`;
  const cached = ctx.playerHit.get(key);
  if (cached !== undefined) {
    ctx.hits++;
    return cached;
  }
  ctx.misses++;

  let ev = 0;
  for (let i = 0; i < RANKS.length; i++) {
    const count = counts[i];
    if (count === 0) continue;
    const p = count / remaining;
    const next = addCardToTotal(total, soft, RANKS[i]);
    if (next.total > 21) {
      ev += p * -1;
      continue;
    }
    const nextCounts = removeCard(counts, i);
    const stand = standEV(next.total, upcard, nextCounts, ctx);
    const hit = hitEV(next.total, next.soft, upcard, nextCounts, ctx);
    ev += p * Math.max(stand, hit);
  }

  ctx.playerHit.set(key, ev);
  return ev;
}

/** Meilleure EV entre rester et tirer. */
export function bestEV(
  total: number,
  soft: boolean,
  upcard: CardRank,
  counts: Counts,
  ctx: EngineContext,
): number {
  return Math.max(standEV(total, upcard, counts, ctx), hitEV(total, soft, upcard, counts, ctx));
}

/** EV de doubler : une seule carte, mise doublée, aucun tirage ensuite. */
export function doubleEV(
  total: number,
  soft: boolean,
  upcard: CardRank,
  counts: Counts,
  ctx: EngineContext,
): number {
  const remaining = countsTotal(counts);
  if (remaining === 0) return 2 * standEV(total, upcard, counts, ctx);

  let ev = 0;
  for (let i = 0; i < RANKS.length; i++) {
    const count = counts[i];
    if (count === 0) continue;
    const p = count / remaining;
    const next = addCardToTotal(total, soft, RANKS[i]);
    if (next.total > 21) {
      ev += p * -2;
      continue;
    }
    ev += p * 2 * standEV(next.total, upcard, removeCard(counts, i), ctx);
  }
  return ev;
}

function doubleAllowedByRules(total: number, soft: boolean, ctx: EngineContext): boolean {
  switch (ctx.rules.doubleOn) {
    case 'any':
      return true;
    case '9-11':
      return !soft && total >= 9 && total <= 11;
    case '10-11':
      return !soft && total >= 10 && total <= 11;
  }
}

/**
 * EV d'UNE main issue d'un split : on tire la deuxième carte, puis on joue
 * optimalement (avec double après split si la règle l'autorise).
 */
export function splitHandEV(
  pairRank: CardRank,
  upcard: CardRank,
  counts: Counts,
  ctx: EngineContext,
): number {
  const remaining = countsTotal(counts);
  if (remaining === 0) return 0;

  const base = addCardToTotal(0, false, pairRank);
  const acesOneCard = pairRank === 'A' && ctx.rules.oneCardAfterSplitAces;

  let ev = 0;
  for (let i = 0; i < RANKS.length; i++) {
    const count = counts[i];
    if (count === 0) continue;
    const p = count / remaining;
    const next = addCardToTotal(base.total, base.soft, RANKS[i]);
    const nextCounts = removeCard(counts, i);

    if (acesOneCard) {
      ev += p * standEV(next.total, upcard, nextCounts, ctx);
      continue;
    }

    let best = bestEV(next.total, next.soft, upcard, nextCounts, ctx);
    if (ctx.rules.doubleAfterSplit && doubleAllowedByRules(next.total, next.soft, ctx)) {
      best = Math.max(best, doubleEV(next.total, next.soft, upcard, nextCounts, ctx));
    }
    ev += p * best;
  }
  return ev;
}

interface Leaf {
  counts: number[];
  prob: number;
}

function addLeaf(out: Map<string, Leaf>, counts: number[], prob: number): void {
  const key = countsKey(counts);
  const existing = out.get(key);
  if (existing) existing.prob += prob;
  else out.set(key, { counts, prob });
}

/**
 * Parcourt le jeu optimal d'une main et accumule la distribution des sabots
 * qu'elle laisse derrière elle.
 *
 * Les EV nécessaires pour choisir l'action à chaque nœud sont déjà en cache
 * (`splitHandEV` a été appelé juste avant), donc ce parcours est bon marché.
 * Les feuilles sont dédupliquées par composition de sabot : l'ordre des tirages
 * n'a aucune importance, ce qui réduit énormément le nombre d'états distincts.
 */
function collectLeaves(
  total: number,
  soft: boolean,
  upcard: CardRank,
  counts: Counts,
  canDouble: boolean,
  weight: number,
  ctx: EngineContext,
  out: Map<string, Leaf>,
): void {
  const remaining = countsTotal(counts);
  const stand = standEV(total, upcard, counts, ctx);
  const hit = remaining > 0 ? hitEV(total, soft, upcard, counts, ctx) : Number.NEGATIVE_INFINITY;
  const dbl =
    canDouble && remaining > 0 && doubleAllowedByRules(total, soft, ctx)
      ? doubleEV(total, soft, upcard, counts, ctx)
      : Number.NEGATIVE_INFINITY;

  const best = Math.max(stand, hit, dbl);

  if (best === stand || remaining === 0) {
    addLeaf(out, counts.slice(), weight);
    return;
  }

  if (best === dbl) {
    for (let i = 0; i < RANKS.length; i++) {
      if (counts[i] === 0) continue;
      addLeaf(out, removeCard(counts, i), (weight * counts[i]) / remaining);
    }
    return;
  }

  for (let i = 0; i < RANKS.length; i++) {
    if (counts[i] === 0) continue;
    const p = (weight * counts[i]) / remaining;
    const next = addCardToTotal(total, soft, RANKS[i]);
    const nextCounts = removeCard(counts, i);
    if (next.total > 21) {
      addLeaf(out, nextCounts, p);
      continue;
    }
    collectLeaves(next.total, next.soft, upcard, nextCounts, false, p, ctx, out);
  }
}

/**
 * EV totale d'un split (les deux mains cumulées).
 *
 * En mode cascade, la deuxième main est évaluée sur le sabot réellement laissé
 * par la première, pondéré par la probabilité de chaque composition résiduelle.
 * Sinon, les deux mains sont évaluées sur le même sabot (2 × EV d'une main).
 *
 * Le re-split n'est pas modélisé : au plus deux mains.
 */
export function splitEV(
  pairRank: CardRank,
  upcard: CardRank,
  counts: Counts,
  ctx: EngineContext,
): number {
  const firstHand = splitHandEV(pairRank, upcard, counts, ctx);

  if (!ctx.rules.splitCascade) return 2 * firstHand;

  const leaves = new Map<string, Leaf>();
  const base = addCardToTotal(0, false, pairRank);
  const remaining = countsTotal(counts);
  if (remaining === 0) return 2 * firstHand;

  const acesOneCard = pairRank === 'A' && ctx.rules.oneCardAfterSplitAces;

  for (let i = 0; i < RANKS.length; i++) {
    if (counts[i] === 0) continue;
    const p = counts[i] / remaining;
    const nextCounts = removeCard(counts, i);
    if (acesOneCard) {
      addLeaf(leaves, nextCounts, p);
      continue;
    }
    const next = addCardToTotal(base.total, base.soft, RANKS[i]);
    collectLeaves(
      next.total,
      next.soft,
      upcard,
      nextCounts,
      ctx.rules.doubleAfterSplit,
      p,
      ctx,
      leaves,
    );
  }

  let secondHand = 0;
  for (const leaf of leaves.values()) {
    secondHand += leaf.prob * splitHandEV(pairRank, upcard, leaf.counts, ctx);
  }

  return firstHand + secondHand;
}

/** Probabilité exacte de dépasser 21 en tirant exactement une carte. */
export function bustProbabilityOnHit(total: number, soft: boolean, counts: Counts): number {
  const remaining = countsTotal(counts);
  if (remaining === 0) return 0;
  let p = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (counts[i] === 0) continue;
    if (addCardToTotal(total, soft, RANKS[i]).total > 21) p += counts[i] / remaining;
  }
  return p;
}

/**
 * Évaluation complète d'une situation de jeu.
 *
 * `shoe` doit déjà être privé des cartes du joueur et de la carte visible du
 * croupier : ce sont des cartes vues, elles ne peuvent plus sortir.
 */
export function evaluate(
  shoe: ShoeState,
  hand: Hand,
  upcard: CardRank,
  ctx: EngineContext,
): DecisionResult {
  const startedAt = Date.now();
  const counts = toCounts(shoe);
  const { total, soft } = handTotal(hand.cards);
  const natural = isBlackjack(hand);
  const bust = total > 21;

  const outcome = dealerOutcome(upcard, counts, ctx);
  const conditional = conditionalDealerDistribution(upcard, counts, ctx);

  // Sans peek (règle européenne OBO), le joueur perd sa mise initiale face à un
  // blackjack du croupier ; avec peek, la main est résolue avant toute décision.
  const bjProb = outcome.blackjack;
  const applyNoPeek = (evConditional: number): number =>
    ctx.rules.peek ? evConditional : bjProb * -1 + (1 - bjProb) * evConditional;

  const actions: ActionEV[] = [];

  const push = (
    action: Action,
    available: boolean,
    ev: number,
    unavailableReason?: UnavailableReason,
  ): void => {
    actions.push({ action, ev, available, unavailableReason });
  };

  if (bust) {
    push('stand', true, -1);
    push('hit', false, -1, { code: 'busted' });
    push('double', false, -1, { code: 'busted' });
    push('split', false, -1, { code: 'busted' });
  } else if (natural) {
    push('stand', true, applyNoPeek(ctx.rules.blackjackPayout));
    push('hit', false, 0, { code: 'blackjack' });
    push('double', false, 0, { code: 'blackjack' });
    push('split', false, 0, { code: 'blackjack' });
  } else {
    push('stand', true, applyNoPeek(standEV(total, upcard, counts, ctx)));

    const canHit = total < 21;
    push(
      'hit',
      canHit,
      canHit ? applyNoPeek(hitEV(total, soft, upcard, counts, ctx)) : -1,
      canHit ? undefined : { code: 'total21' },
    );

    const twoCards = hand.cards.length === 2;
    const doubleRuleOk = doubleAllowedByRules(total, soft, ctx);
    const dasOk = !hand.isSplit || ctx.rules.doubleAfterSplit;
    const canDouble = twoCards && doubleRuleOk && dasOk;
    let doubleReason: UnavailableReason | undefined;
    if (!twoCards) doubleReason = { code: 'doubleTwoCards' };
    else if (!dasOk) doubleReason = { code: 'doubleAfterSplit' };
    else if (!doubleRuleOk) doubleReason = { code: 'doubleLimited', rule: ctx.rules.doubleOn };
    push(
      'double',
      canDouble,
      canDouble ? applyNoPeek(doubleEV(total, soft, upcard, counts, ctx)) : -2,
      doubleReason,
    );

    const pair = isPair(hand);
    const canSplit = pair && !hand.isSplit;
    let splitReason: UnavailableReason | undefined;
    if (!pair) splitReason = { code: 'notPair' };
    else if (hand.isSplit) splitReason = { code: 'resplit' };
    push(
      'split',
      canSplit,
      canSplit
        ? applyNoPeek(splitEV(hand.cards[0], upcard, counts, ctx))
        : Number.NEGATIVE_INFINITY,
      splitReason,
    );
  }

  const available = actions.filter((a) => a.available);
  const recommended = available.reduce((best, a) => (a.ev > best.ev ? a : best), available[0])
    .action;

  return {
    playerTotal: total,
    playerSoft: soft,
    isBlackjack: natural,
    isBust: bust,
    bustProbabilityOnHit: bustProbabilityOnHit(total, soft, counts),
    dealerBlackjackProbability: bjProb,
    dealerDistribution: Array.from(conditional),
    actions,
    recommended,
    cacheStats: cacheStats(ctx),
    computeTimeMs: Date.now() - startedAt,
  };
}
