import { describe, expect, it } from 'vitest';
import { createContext } from '../context';
import { evaluate, splitEV, splitHandEV } from '../ev';
import { createShoe, drawFromShoe, toCounts } from '../shoe';
import { DEFAULT_RULES, type CardRank } from '../types';

function shoeAfter(cards: CardRank[], decks = 6) {
  let shoe = createShoe(decks);
  for (const card of cards) shoe = drawFromShoe(shoe, card);
  return shoe;
}

function evOf(action: string, cards: CardRank[], up: CardRank, rules = DEFAULT_RULES) {
  const shoe = shoeAfter([...cards, up]);
  const result = evaluate(shoe, { cards, isSplit: false }, up, createContext(rules));
  return result.actions.find((a) => a.action === action)!.ev;
}

describe('EV de split', () => {
  it('rend le split de 8,8 contre 10 meilleur que tirer ou rester', () => {
    const shoe = shoeAfter(['8', '8', 'T']);
    const result = evaluate(shoe, { cards: ['8', '8'], isSplit: false }, 'T', createContext(DEFAULT_RULES));
    const ev = (a: string) => result.actions.find((x) => x.action === a)!.ev;
    expect(ev('split')).toBeGreaterThan(ev('hit'));
    expect(ev('split')).toBeGreaterThan(ev('stand'));
    // Splitter deux 8 contre un 10 reste perdant : c'est une limitation de perte.
    expect(ev('split')).toBeLessThan(0);
  }, 120000);

  it('ne split jamais deux 10 contre un 6', () => {
    expect(evOf('stand', ['T', 'T'], '6')).toBeGreaterThan(evOf('split', ['T', 'T'], '6'));
  }, 120000);

  it('donne une EV positive au split de deux As contre un 6', () => {
    expect(evOf('split', ['A', 'A'], '6')).toBeGreaterThan(0);
  }, 120000);

  it('vaut environ deux fois l\'EV d\'une seule main', () => {
    const ctx = createContext({ ...DEFAULT_RULES, splitCascade: false });
    const counts = toCounts(shoeAfter(['8', '8', '6']));
    expect(splitEV('8', '6', counts, ctx)).toBeCloseTo(2 * splitHandEV('8', '6', counts, ctx), 12);
  }, 120000);
});

describe('cascade du sabot entre les deux mains', () => {
  it('donne un résultat très proche du modèle sans cascade', () => {
    // La cascade est exacte mais l'effet de la première main sur le sabot est
    // minuscule : l'écart doit rester bien en dessous de 0.001 sur 6 jeux.
    const counts = toCounts(shoeAfter(['8', '8', 'T']));
    const cascade = splitEV('8', 'T', counts, createContext({ ...DEFAULT_RULES, splitCascade: true }));
    const flat = splitEV('8', 'T', counts, createContext({ ...DEFAULT_RULES, splitCascade: false }));
    expect(cascade).toBeCloseTo(flat, 3);
    expect(cascade).not.toBe(flat);
  }, 300000);

  it('pèse davantage sur un seul jeu que sur huit', () => {
    const gap = (decks: number) => {
      const counts = toCounts(shoeAfter(['8', '8', 'T'], decks));
      const cascade = splitEV('8', 'T', counts, createContext({ ...DEFAULT_RULES, splitCascade: true }));
      const flat = splitEV('8', 'T', counts, createContext({ ...DEFAULT_RULES, splitCascade: false }));
      return Math.abs(cascade - flat);
    };
    expect(gap(1)).toBeGreaterThan(gap(8));
  }, 300000);

  it('est déterministe', () => {
    const counts = toCounts(shoeAfter(['9', '9', '7']));
    const a = splitEV('9', '7', counts, createContext(DEFAULT_RULES));
    const b = splitEV('9', '7', counts, createContext(DEFAULT_RULES));
    expect(a).toBe(b);
  }, 300000);
});

describe('règle des as splittés', () => {
  it('vaut moins cher quand une seule carte est autorisée', () => {
    const counts = toCounts(shoeAfter(['A', 'A', '6']));
    const oneCard = splitEV('A', '6', counts, createContext({ ...DEFAULT_RULES, splitCascade: false }));
    const freePlay = splitEV(
      'A',
      '6',
      counts,
      createContext({ ...DEFAULT_RULES, oneCardAfterSplitAces: false, splitCascade: false }),
    );
    expect(freePlay).toBeGreaterThan(oneCard);
  }, 120000);
});

describe('re-split', () => {
  it('est explicitement refusé sur une main déjà splittée', () => {
    const shoe = shoeAfter(['8', '8', 'T']);
    const result = evaluate(shoe, { cards: ['8', '8'], isSplit: true }, 'T', createContext(DEFAULT_RULES));
    const split = result.actions.find((a) => a.action === 'split')!;
    expect(split.available).toBe(false);
    expect(split.unavailableReason).toEqual({ code: 'resplit' });
  }, 120000);
});
