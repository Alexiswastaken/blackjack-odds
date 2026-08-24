import { describe, expect, it } from 'vitest';
import {
  countsKey,
  createShoe,
  drawFromShoe,
  fromCounts,
  nextCardProbabilities,
  probabilityOfNext,
  returnToShoe,
  toCounts,
} from '../shoe';
import { RANKS } from '../types';

describe('createShoe', () => {
  it('construit 4 cartes par rang et 16 pour T, par jeu', () => {
    const shoe = createShoe(6);
    expect(shoe.totalRemaining).toBe(312);
    expect(shoe.remaining.T).toBe(96);
    expect(shoe.remaining.A).toBe(24);
    expect(shoe.remaining['7']).toBe(24);
  });

  it('refuse un nombre de jeux invalide', () => {
    expect(() => createShoe(0)).toThrow();
    expect(() => createShoe(1.5)).toThrow();
  });
});

describe('probabilités de la prochaine carte', () => {
  it('vaut R_v / R', () => {
    const shoe = createShoe(6);
    expect(probabilityOfNext(shoe, 'T')).toBeCloseTo(96 / 312, 12);
    expect(probabilityOfNext(shoe, 'A')).toBeCloseTo(24 / 312, 12);
  });

  it('somme à 1 sur tous les rangs', () => {
    const shoe = createShoe(2);
    const probs = nextCardProbabilities(shoe);
    expect(RANKS.reduce((sum, r) => sum + probs[r], 0)).toBeCloseTo(1, 12);
  });

  it('se met à jour après un tirage', () => {
    let shoe = createShoe(1);
    shoe = drawFromShoe(shoe, 'A');
    expect(shoe.totalRemaining).toBe(51);
    expect(probabilityOfNext(shoe, 'A')).toBeCloseTo(3 / 51, 12);
  });

  it('renvoie 0 sur un sabot vide', () => {
    const empty = fromCounts(new Array(10).fill(0), 1);
    expect(probabilityOfNext(empty, 'A')).toBe(0);
  });
});

describe('drawFromShoe / returnToShoe', () => {
  it('sont réversibles', () => {
    const shoe = createShoe(6);
    expect(returnToShoe(drawFromShoe(shoe, '5'), '5')).toEqual(shoe);
  });

  it('refusent de tirer une carte épuisée', () => {
    let shoe = createShoe(1);
    for (let i = 0; i < 4; i++) shoe = drawFromShoe(shoe, 'A');
    expect(() => drawFromShoe(shoe, 'A')).toThrow(/Plus aucune carte/);
  });

  it('refusent de sur-remplir le sabot', () => {
    const shoe = createShoe(1);
    expect(() => returnToShoe(shoe, '9')).toThrow(/contient déjà/);
  });

  it('ne mutent pas le sabot d\'origine', () => {
    const shoe = createShoe(1);
    drawFromShoe(shoe, '9');
    expect(shoe.remaining['9']).toBe(4);
    expect(shoe.totalRemaining).toBe(52);
  });
});

describe('clé canonique', () => {
  it('est identique quel que soit l\'ordre des sorties', () => {
    let a = createShoe(6);
    let b = createShoe(6);
    for (const c of ['A', '5', 'T', '5'] as const) a = drawFromShoe(a, c);
    for (const c of ['5', 'T', '5', 'A'] as const) b = drawFromShoe(b, c);
    expect(countsKey(toCounts(a))).toBe(countsKey(toCounts(b)));
  });

  it('distingue deux compositions différentes', () => {
    const a = drawFromShoe(createShoe(6), 'A');
    const b = drawFromShoe(createShoe(6), '2');
    expect(countsKey(toCounts(a))).not.toBe(countsKey(toCounts(b)));
  });
});

describe('toCounts / fromCounts', () => {
  it('font un aller-retour fidèle', () => {
    const shoe = drawFromShoe(drawFromShoe(createShoe(8), 'T'), '3');
    expect(fromCounts(toCounts(shoe), 8)).toEqual(shoe);
  });
});
