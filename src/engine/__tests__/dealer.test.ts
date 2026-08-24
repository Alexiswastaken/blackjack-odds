import { describe, expect, it } from 'vitest';
import { createContext } from '../context';
import { conditionalDealerDistribution, dealerOutcome, dealerPlayFrom, dealerStands } from '../dealer';
import { createShoe, drawFromShoe, toCounts } from '../shoe';
import { DEALER_BUST_INDEX, DEFAULT_RULES, RANKS, type CardRank, type Rules } from '../types';

const S17: Rules = { ...DEFAULT_RULES, soft17: 'S17' };
const H17: Rules = { ...DEFAULT_RULES, soft17: 'H17' };

function outcomeFor(up: CardRank, rules: Rules, decks = 6) {
  const ctx = createContext(rules);
  const shoe = drawFromShoe(createShoe(decks), up);
  return dealerOutcome(up, toCounts(shoe), ctx);
}

describe('dealerStands', () => {
  it('applique la règle S17', () => {
    expect(dealerStands(17, true, S17)).toBe(true);
    expect(dealerStands(17, false, S17)).toBe(true);
    expect(dealerStands(16, false, S17)).toBe(false);
  });

  it('applique la règle H17 : seul le soft 17 change', () => {
    expect(dealerStands(17, true, H17)).toBe(false);
    expect(dealerStands(17, false, H17)).toBe(true);
    expect(dealerStands(18, true, H17)).toBe(true);
  });
});

describe('dealerOutcome', () => {
  it('produit une distribution qui somme à 1 pour chaque carte visible', () => {
    for (const up of RANKS) {
      const { blackjack, dist } = outcomeFor(up, S17);
      const sum = blackjack + dist.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
    }
  });

  it('ne compte un blackjack que sur As ou 10', () => {
    for (const up of RANKS) {
      const { blackjack } = outcomeFor(up, S17);
      if (up === 'A' || up === 'T') expect(blackjack).toBeGreaterThan(0);
      else expect(blackjack).toBe(0);
    }
  });

  it('calcule exactement la probabilité de blackjack sur un sabot de 6 jeux', () => {
    // As visible : il reste 96 T parmi 311 cartes.
    expect(outcomeFor('A', S17).blackjack).toBeCloseTo(96 / 311, 12);
    // 10 visible : il reste 24 As parmi 311 cartes.
    expect(outcomeFor('T', S17).blackjack).toBeCloseTo(24 / 311, 12);
  });

  it('retrouve les probabilités de bust publiées (6 jeux, S17)', () => {
    // Références classiques des tables de blackjack (jeu infini) ; l'écart
    // attendu avec un sabot réel de 6 jeux est de l'ordre de 0.001.
    const published: Partial<Record<CardRank, number>> = {
      '2': 0.3536,
      '3': 0.3739,
      '4': 0.3954,
      '5': 0.418,
      '6': 0.423,
      '7': 0.262,
      '8': 0.245,
      '9': 0.2283,
    };
    for (const [up, expected] of Object.entries(published)) {
      const { dist } = outcomeFor(up as CardRank, S17);
      expect(dist[DEALER_BUST_INDEX]).toBeCloseTo(expected as number, 2);
    }
  });

  it('retrouve les bust publiés pour 10 et As, conditionnés à l\'absence de blackjack', () => {
    const ctx = createContext(S17);
    for (const [up, expected] of [
      ['T', 0.23],
      ['A', 0.167],
    ] as [CardRank, number][]) {
      const shoe = drawFromShoe(createShoe(6), up);
      const dist = conditionalDealerDistribution(up, toCounts(shoe), ctx);
      expect(dist[DEALER_BUST_INDEX]).toBeCloseTo(expected, 2);
    }
  });

  it('confirme que le 6 est la carte qui fait le plus buster le croupier', () => {
    const bust = (up: CardRank) => outcomeFor(up, S17).dist[DEALER_BUST_INDEX];
    expect(bust('6')).toBeGreaterThan(bust('5'));
    expect(bust('6')).toBeGreaterThan(bust('4'));
    expect(bust('6')).toBeGreaterThan(bust('7'));
  });
});

describe('S17 contre H17', () => {
  it('augmente le bust du croupier sur un As visible en H17', () => {
    const s = outcomeFor('A', S17);
    const h = outcomeFor('A', H17);
    // En H17 le croupier retire sur soft 17 : il buste plus et fait moins de 17.
    expect(h.dist[DEALER_BUST_INDEX]).toBeGreaterThan(s.dist[DEALER_BUST_INDEX]);
    expect(h.dist[0]).toBeLessThan(s.dist[0]);
  });

  it('ne change rien quand le croupier ne peut pas faire de soft 17', () => {
    // Avec un 10 visible et aucun as dans le sabot, aucune main soft n'est possible.
    const counts = toCounts(createShoe(6)).slice();
    counts[0] = 0; // plus aucun as
    counts[9] -= 1; // le 10 visible est sorti
    const s = dealerOutcome('T', counts, createContext(S17));
    const h = dealerOutcome('T', counts, createContext(H17));
    expect(Array.from(h.dist)).toEqual(Array.from(s.dist));
  });
});

describe('dealerPlayFrom', () => {
  it('fige une main déjà arrêtée', () => {
    const counts = toCounts(createShoe(6));
    const dist = dealerPlayFrom(20, false, counts, createContext(S17));
    expect(dist[3]).toBe(1); // index 3 = total 20
  });

  it('renvoie un bust certain au-dessus de 21', () => {
    const counts = toCounts(createShoe(6));
    const dist = dealerPlayFrom(23, false, counts, createContext(S17));
    expect(dist[DEALER_BUST_INDEX]).toBe(1);
  });

  it('ne peut jamais buster depuis 17 en S17', () => {
    const counts = toCounts(createShoe(6));
    const dist = dealerPlayFrom(17, true, counts, createContext(S17));
    expect(dist[DEALER_BUST_INDEX]).toBe(0);
    expect(dist[0]).toBe(1);
  });
});
