import { describe, expect, it } from 'vitest';
import { createContext } from '../context';
import { evaluate, settleRound } from '../decide';
import { createShoe, drawFromShoe } from '../shoe';
import { DEFAULT_RULES, type CardRank, type Outcome } from '../types';

function situation(cards: CardRank[], up: CardRank, rules = DEFAULT_RULES, decks = 6) {
  let shoe = createShoe(decks);
  for (const card of [...cards, up]) shoe = drawFromShoe(shoe, card);
  return evaluate(shoe, { cards, isSplit: false }, up, createContext(rules));
}

const total = (o: Outcome) => o.win + o.push + o.lose;

describe('cohérence des probabilités', () => {
  it('somment à 1 pour chaque action disponible', () => {
    const cases: [CardRank[], CardRank][] = [
      [['T', '6'], 'T'],
      [['A', '7'], '3'],
      [['2', '9'], '6'],
      [['8', '8'], 'T'],
      [['T', 'T'], '5'],
      [['A', 'T'], '9'],
    ];

    for (const [cards, up] of cases) {
      for (const action of situation(cards, up).actions) {
        if (!action.available) continue;
        expect(total(action.outcome), `${cards.join('+')} vs ${up} — ${action.action}`).toBeCloseTo(
          1,
          10,
        );
      }
    }
  }, 300000);

  it('ne renvoie jamais de probabilité négative', () => {
    for (const action of situation(['9', '7'], '9').actions) {
      expect(action.outcome.win).toBeGreaterThanOrEqual(0);
      expect(action.outcome.push).toBeGreaterThanOrEqual(0);
      expect(action.outcome.lose).toBeGreaterThanOrEqual(0);
    }
  }, 120000);
});

/**
 * L'invariante centrale : les issues sont calculées séparément de l'EV, mais les
 * deux doivent se recouper. Rester et tirer engagent une unité de mise, donc
 * `EV = gain − perte` ; doubler en engage deux.
 */
describe('accord entre EV et probabilités', () => {
  const cases: [CardRank[], CardRank][] = [
    [['T', '6'], 'T'],
    [['T', '6'], '6'],
    [['A', '7'], '3'],
    [['2', '9'], '6'],
    [['T', '9'], '4'],
    [['2', '3'], 'A'],
  ];

  it('vérifie EV = gain − perte pour rester et tirer', () => {
    for (const [cards, up] of cases) {
      const result = situation(cards, up);
      for (const action of result.actions) {
        if (!action.available || (action.action !== 'stand' && action.action !== 'hit')) continue;
        expect(action.ev, `${cards.join('+')} vs ${up} — ${action.action}`).toBeCloseTo(
          action.outcome.win - action.outcome.lose,
          10,
        );
      }
    }
  }, 300000);

  it('vérifie EV = 2 × (gain − perte) pour doubler', () => {
    for (const [cards, up] of cases) {
      const double = situation(cards, up).actions.find((a) => a.action === 'double');
      if (!double?.available) continue;
      expect(double.ev, `${cards.join('+')} vs ${up}`).toBeCloseTo(
        2 * (double.outcome.win - double.outcome.lose),
        10,
      );
    }
  }, 300000);

  it('tient aussi sans peek, où le blackjack du croupier fait perdre', () => {
    const rules = { ...DEFAULT_RULES, peek: false };
    const stand = situation(['T', '6'], 'A', rules).actions.find((a) => a.action === 'stand')!;
    expect(total(stand.outcome)).toBeCloseTo(1, 10);
    expect(stand.ev).toBeCloseTo(stand.outcome.win - stand.outcome.lose, 10);
  }, 120000);
});

describe('valeurs de référence', () => {
  it('donne les bonnes chances à un 20 contre un 6', () => {
    const stand = situation(['T', 'T'], '6').actions.find((a) => a.action === 'stand')!;
    // Le croupier buste ~42 % du temps et ne bat 20 qu'avec 21.
    expect(stand.outcome.win).toBeCloseTo(0.8, 2);
    expect(stand.outcome.push).toBeCloseTo(0.1, 2);
    expect(stand.outcome.lose).toBeCloseTo(0.1, 2);
  }, 120000);

  it('donne un blackjack gagnant à coup sûr quand le croupier vérifie sa main', () => {
    const result = situation(['A', 'T'], '9');
    const stand = result.actions.find((a) => a.action === 'stand')!;
    expect(result.isBlackjack).toBe(true);
    expect(stand.outcome).toEqual({ win: 1, push: 0, lose: 0 });
    expect(stand.ev).toBe(1.5);
  }, 120000);

  it('fait du blackjack une égalité, jamais une défaite, en règle européenne', () => {
    const rules = { ...DEFAULT_RULES, peek: false };
    const stand = situation(['A', 'T'], 'A', rules).actions.find((a) => a.action === 'stand')!;
    expect(stand.outcome.lose).toBe(0);
    expect(stand.outcome.push).toBeGreaterThan(0);
    expect(stand.ev).toBeGreaterThan(0);
  }, 120000);

  it('perd toujours sur une main déjà bustée', () => {
    const stand = situation(['T', '9', '5'], '6').actions.find((a) => a.action === 'stand')!;
    expect(stand.outcome).toEqual({ win: 0, push: 0, lose: 1 });
  }, 120000);

  it('gagne plus souvent en restant sur 20 qu\'en restant sur 16', () => {
    const strong = situation(['T', 'T'], '7').actions.find((a) => a.action === 'stand')!;
    const weak = situation(['T', '6'], '7').actions.find((a) => a.action === 'stand')!;
    expect(strong.outcome.win).toBeGreaterThan(weak.outcome.win);
  }, 120000);

  it("montre qu'une EV plus élevée ne signifie pas gagner plus souvent", () => {
    // Doubler sur 11 rapporte davantage que tirer, mais gagne à peu près aussi
    // souvent : c'est la mise engagée qui change, pas la fréquence des victoires.
    const result = situation(['2', '9'], '6');
    const double = result.actions.find((a) => a.action === 'double')!;
    const hit = result.actions.find((a) => a.action === 'hit')!;

    expect(double.ev).toBeGreaterThan(hit.ev);
    expect(double.outcome.win).toBeLessThan(hit.outcome.win + 0.02);
  }, 120000);
});

describe('règlement du tour', () => {
  const rules = DEFAULT_RULES;

  it('attend que le croupier ait fini de tirer', () => {
    expect(settleRound(['T', '9'], ['6'], rules).result).toBe('pending');
    expect(settleRound(['T', '9'], ['6', '5'], rules).result).toBe('pending');
  });

  it('ne conclut rien tant que la carte cachée du croupier est inconnue', () => {
    // Un blackjack ne gagne pas encore : le croupier peut l'égaler.
    expect(settleRound(['A', 'T'], ['T'], rules).result).toBe('pending');
    expect(settleRound(['A', 'T'], ['A'], rules).result).toBe('pending');
    // Il gagne dès que la carte cachée exclut un naturel.
    expect(settleRound(['A', 'T'], ['T', '7'], rules).result).toBe('win');
  });

  it('règle une main une fois le croupier arrêté', () => {
    expect(settleRound(['T', '9'], ['6', '5', '7'], rules).result).toBe('win');
    expect(settleRound(['T', '7'], ['9', '9'], rules).result).toBe('lose');
    expect(settleRound(['T', '8'], ['T', '8'], rules).result).toBe('push');
  });

  it('fait perdre le joueur busté sans attendre le croupier', () => {
    const settlement = settleRound(['T', '9', '5'], ['6'], rules);
    expect(settlement.result).toBe('lose');
    expect(settlement.playerBust).toBe(true);
    expect(settlement.payout).toBe(-1);
  });

  it('fait gagner le joueur quand le croupier buste', () => {
    const settlement = settleRound(['T', '6'], ['T', '6', 'T'], rules);
    expect(settlement.result).toBe('win');
    expect(settlement.dealerBust).toBe(true);
    expect(settlement.payout).toBe(1);
  });

  it('paie le blackjack au taux configuré', () => {
    expect(settleRound(['A', 'T'], ['9', '8'], rules).payout).toBe(1.5);
    expect(settleRound(['A', 'T'], ['9', '8'], { ...rules, blackjackPayout: 1.2 }).payout).toBe(1.2);
  });

  it('met deux blackjacks à égalité', () => {
    const settlement = settleRound(['A', 'T'], ['T', 'A'], rules);
    expect(settlement.result).toBe('push');
    expect(settlement.payout).toBe(0);
  });

  it('distingue un blackjack d\'un 21 en trois cartes', () => {
    // 21 en trois cartes contre blackjack du croupier : le joueur perd.
    expect(settleRound(['7', '7', '7'], ['A', 'T'], rules).result).toBe('lose');
    // Et il ne fait qu'égaliser contre un 21 ordinaire.
    expect(settleRound(['7', '7', '7'], ['T', '5', '6'], rules).result).toBe('push');
  });

  it('applique la règle H17 pour savoir si le croupier a fini', () => {
    const soft17: CardRank[] = ['A', '6'];
    expect(settleRound(['T', '8'], soft17, { ...rules, soft17: 'S17' }).result).toBe('win');
    expect(settleRound(['T', '8'], soft17, { ...rules, soft17: 'H17' }).result).toBe('pending');
  });
});
