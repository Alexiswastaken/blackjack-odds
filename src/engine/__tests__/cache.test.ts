import { describe, expect, it } from 'vitest';
import { cacheStats, clearCaches, createContext, type EngineContext } from '../context';
import { evaluate } from '../decide';
import { dealerOutcome } from '../dealer';
import { createShoe, drawFromShoe, toCounts } from '../shoe';
import { DEFAULT_RULES, type CardRank } from '../types';

/** Map qui n'enregistre jamais rien : elle neutralise la mémoïsation. */
class NoCacheMap<K, V> extends Map<K, V> {
  override set(): this {
    return this;
  }
}

function uncachedContext(rules = DEFAULT_RULES): EngineContext {
  const ctx = createContext(rules);
  ctx.dealerPlay = new NoCacheMap();
  ctx.dealerOutcome = new NoCacheMap();
  ctx.playerHit = new NoCacheMap();
  ctx.playerHitOutcome = new NoCacheMap();
  return ctx;
}

function shoeAfter(cards: CardRank[], decks = 1) {
  let shoe = createShoe(decks);
  for (const card of cards) shoe = drawFromShoe(shoe, card);
  return shoe;
}

describe('non-régression du cache', () => {
  it('donne exactement les mêmes EV avec et sans mémoïsation', () => {
    const rules = { ...DEFAULT_RULES, splitCascade: false };
    for (const [cards, up] of [
      [['T', '6'], 'T'],
      [['A', '7'], '3'],
      [['2', '9'], '6'],
      [['9', '9'], '7'],
    ] as [CardRank[], CardRank][]) {
      const shoe = shoeAfter([...cards, up]);
      const hand = { cards, isSplit: false };
      const cached = evaluate(shoe, hand, up, createContext(rules));
      const uncached = evaluate(shoe, hand, up, uncachedContext(rules));

      expect(cached.recommended).toBe(uncached.recommended);
      cached.actions.forEach((action, i) => {
        const reference = uncached.actions[i];
        expect(action.ev).toBeCloseTo(reference.ev, 12);
        // Les probabilités d'issue ont leur propre cache : elles doivent être
        // couvertes par la non-régression au même titre que l'EV.
        expect(action.outcome.win).toBeCloseTo(reference.outcome.win, 12);
        expect(action.outcome.push).toBeCloseTo(reference.outcome.push, 12);
        expect(action.outcome.lose).toBeCloseTo(reference.outcome.lose, 12);
      });
      expect(cached.dealerDistribution).toEqual(uncached.dealerDistribution);
    }
  }, 300000);

  it('ne diffère que par le temps de calcul et le nombre d\'états stockés', () => {
    const rules = { ...DEFAULT_RULES, splitCascade: false };
    const shoe = shoeAfter(['T', '6', 'T']);
    const hand = { cards: ['T', '6'] as CardRank[], isSplit: false };

    const withCache = createContext(rules);
    evaluate(shoe, hand, 'T', withCache);
    const withoutCache = uncachedContext(rules);
    evaluate(shoe, hand, 'T', withoutCache);

    expect(cacheStats(withCache).size).toBeGreaterThan(0);
    expect(cacheStats(withoutCache).size).toBe(0);
    expect(cacheStats(withoutCache).hits).toBe(0);
  }, 300000);
});

describe('efficacité du cache', () => {
  it('accumule des hits dès la première évaluation', () => {
    const ctx = createContext(DEFAULT_RULES);
    const shoe = shoeAfter(['T', '6', 'T'], 6);
    evaluate(shoe, { cards: ['T', '6'], isSplit: false }, 'T', ctx);
    expect(cacheStats(ctx).hits).toBeGreaterThan(0);
  }, 120000);

  it('sert entièrement une deuxième évaluation identique depuis le cache', () => {
    const ctx = createContext(DEFAULT_RULES);
    const shoe = shoeAfter(['T', '6', 'T'], 6);
    const hand = { cards: ['T', '6'] as CardRank[], isSplit: false };

    evaluate(shoe, hand, 'T', ctx);
    const missesAfterFirst = ctx.misses;
    const hitsAfterFirst = ctx.hits;
    evaluate(shoe, hand, 'T', ctx);

    // Aucun nouvel état à calculer : tout est déjà connu.
    expect(ctx.misses).toBe(missesAfterFirst);
    expect(ctx.hits).toBeGreaterThan(hitsAfterFirst);
  }, 120000);

  it('réutilise le cache entre deux sabots identiques atteints dans un ordre différent', () => {
    const ctx = createContext(DEFAULT_RULES);
    const a = shoeAfter(['A', '5', 'T', '5', 'T', '6', 'T'], 6);
    const b = shoeAfter(['T', '6', 'T', '5', 'T', '5', 'A'], 6);
    const hand = { cards: ['T', '6'] as CardRank[], isSplit: false };

    const first = evaluate(a, hand, 'T', ctx);
    const missesAfterFirst = ctx.misses;
    const second = evaluate(b, hand, 'T', ctx);

    expect(second.actions.map((x) => x.ev)).toEqual(first.actions.map((x) => x.ev));
    expect(ctx.misses).toBe(missesAfterFirst);
  }, 120000);

  it('est vidé par clearCaches', () => {
    const ctx = createContext(DEFAULT_RULES);
    dealerOutcome('6', toCounts(createShoe(6)), ctx);
    expect(cacheStats(ctx).size).toBeGreaterThan(0);

    clearCaches(ctx);
    expect(cacheStats(ctx)).toEqual({ hits: 0, misses: 0, size: 0 });
  });
});
