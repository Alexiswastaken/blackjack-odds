import { cacheStats, type EngineContext } from './context';
import { conditionalDealerDistribution, dealerOutcome, dealerStands } from './dealer';
import {
  bustProbabilityOnHit,
  doubleAllowedByRules,
  doubleEV,
  hitEV,
  splitEV,
  standEV,
} from './ev';
import { doubleOutcome, hitOutcome, splitOutcome, standOutcome, CERTAIN_LOSS } from './outcome';
import { handTotal, isBlackjack, isPair } from './hand';
import { toCounts } from './shoe';
import type {
  Action,
  ActionEV,
  CardRank,
  DecisionResult,
  Hand,
  Outcome,
  RoundSettlement,
  Rules,
  ShoeState,
  UnavailableReason,
} from './types';

const NEUTRAL: Outcome = { win: 0, push: 0, lose: 0 };

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
  const bjProb = outcome.blackjack;

  // Sans peek (règle européenne OBO), le joueur perd sa mise initiale face à un
  // blackjack du croupier ; avec peek, la main est résolue avant toute décision.
  const applyNoPeekEV = (evConditional: number): number =>
    ctx.rules.peek ? evConditional : bjProb * -1 + (1 - bjProb) * evConditional;

  const applyNoPeekOutcome = (o: Outcome): Outcome =>
    ctx.rules.peek
      ? o
      : {
          win: (1 - bjProb) * o.win,
          push: (1 - bjProb) * o.push,
          lose: bjProb + (1 - bjProb) * o.lose,
        };

  const actions: ActionEV[] = [];
  const add = (
    action: Action,
    available: boolean,
    ev: number,
    result: Outcome,
    unavailableReason?: UnavailableReason,
  ): void => {
    actions.push({ action, ev, outcome: result, available, unavailableReason });
  };

  if (bust) {
    add('stand', true, -1, CERTAIN_LOSS);
    add('hit', false, -1, NEUTRAL, { code: 'busted' });
    add('double', false, -1, NEUTRAL, { code: 'busted' });
    add('split', false, -1, NEUTRAL, { code: 'busted' });
  } else if (natural) {
    // Deux blackjacks font une égalité, pas une défaite — d'où le traitement
    // séparé du cas sans peek, qui perd la mise sur toute autre main.
    const ev = ctx.rules.peek
      ? ctx.rules.blackjackPayout
      : (1 - bjProb) * ctx.rules.blackjackPayout;
    const result: Outcome = ctx.rules.peek
      ? { win: 1, push: 0, lose: 0 }
      : { win: 1 - bjProb, push: bjProb, lose: 0 };

    add('stand', true, ev, result);
    add('hit', false, 0, NEUTRAL, { code: 'blackjack' });
    add('double', false, 0, NEUTRAL, { code: 'blackjack' });
    add('split', false, 0, NEUTRAL, { code: 'blackjack' });
  } else {
    add(
      'stand',
      true,
      applyNoPeekEV(standEV(total, upcard, counts, ctx)),
      applyNoPeekOutcome(standOutcome(total, upcard, counts, ctx)),
    );

    const canHit = total < 21;
    add(
      'hit',
      canHit,
      canHit ? applyNoPeekEV(hitEV(total, soft, upcard, counts, ctx)) : -1,
      canHit ? applyNoPeekOutcome(hitOutcome(total, soft, upcard, counts, ctx)) : NEUTRAL,
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

    add(
      'double',
      canDouble,
      canDouble ? applyNoPeekEV(doubleEV(total, soft, upcard, counts, ctx)) : -2,
      canDouble ? applyNoPeekOutcome(doubleOutcome(total, soft, upcard, counts, ctx)) : NEUTRAL,
      doubleReason,
    );

    const pair = isPair(hand);
    const canSplit = pair && !hand.isSplit;
    let splitReason: UnavailableReason | undefined;
    if (!pair) splitReason = { code: 'notPair' };
    else if (hand.isSplit) splitReason = { code: 'resplit' };

    add(
      'split',
      canSplit,
      canSplit
        ? applyNoPeekEV(splitEV(hand.cards[0], upcard, counts, ctx))
        : Number.NEGATIVE_INFINITY,
      canSplit ? applyNoPeekOutcome(splitOutcome(hand.cards[0], upcard, counts, ctx)) : NEUTRAL,
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

/**
 * Règle un tour dont la main du croupier est connue.
 *
 * Aucune probabilité ici : quand le croupier a fini de tirer, il n'y a plus rien
 * à estimer. Renvoie `pending` tant qu'il n'a pas atteint un total d'arrêt.
 */
export function settleRound(
  playerCards: readonly CardRank[],
  dealerCards: readonly CardRank[],
  rules: Rules,
): RoundSettlement {
  const player = handTotal(playerCards);
  const dealer = handTotal(dealerCards);

  const playerBlackjack = playerCards.length === 2 && player.total === 21;
  const dealerBlackjack = dealerCards.length === 2 && dealer.total === 21;
  const playerBust = player.total > 21;
  const dealerBust = dealer.total > 21;

  const base: Omit<RoundSettlement, 'result' | 'payout'> = {
    playerTotal: player.total,
    dealerTotal: dealer.total,
    playerBlackjack,
    dealerBlackjack,
    playerBust,
    dealerBust,
  };

  // Le joueur qui buste paie immédiatement, quoi que fasse le croupier ensuite.
  if (playerBust) return { ...base, result: 'lose', payout: -1 };

  // Tant que la carte cachée n'est pas retournée, rien ne peut être conclu —
  // pas même face à un blackjack du joueur, que le croupier peut égaler.
  if (dealerCards.length < 2) return { ...base, result: 'pending', payout: 0 };

  if (playerBlackjack || dealerBlackjack) {
    if (playerBlackjack && dealerBlackjack) return { ...base, result: 'push', payout: 0 };
    if (playerBlackjack) {
      return { ...base, result: 'win', payout: rules.blackjackPayout };
    }
    return { ...base, result: 'lose', payout: -1 };
  }

  if (dealerBust) return { ...base, result: 'win', payout: 1 };

  // Le croupier n'a pas fini de tirer : le tour n'est pas encore réglé.
  if (!dealerStands(dealer.total, dealer.soft, rules)) {
    return { ...base, result: 'pending', payout: 0 };
  }

  if (player.total > dealer.total) return { ...base, result: 'win', payout: 1 };
  if (player.total < dealer.total) return { ...base, result: 'lose', payout: -1 };
  return { ...base, result: 'push', payout: 0 };
}
