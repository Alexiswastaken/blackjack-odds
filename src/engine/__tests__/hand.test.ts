import { describe, expect, it } from 'vitest';
import { addCardToTotal, handTotal, hardValue, isBlackjack, isPair } from '../hand';

describe('hardValue', () => {
  it('regroupe les figures sur 10 et compte l\'as 1', () => {
    expect(hardValue('T')).toBe(10);
    expect(hardValue('A')).toBe(1);
    expect(hardValue('7')).toBe(7);
  });
});

describe('handTotal', () => {
  it('gère les totaux durs', () => {
    expect(handTotal(['T', '6'])).toEqual({ total: 16, soft: false });
    expect(handTotal(['9', '7'])).toEqual({ total: 16, soft: false });
  });

  it('compte l\'as 11 tant que possible', () => {
    expect(handTotal(['A', '6'])).toEqual({ total: 17, soft: true });
    expect(handTotal(['A', 'T'])).toEqual({ total: 21, soft: true });
    expect(handTotal(['A', 'A'])).toEqual({ total: 12, soft: true });
    expect(handTotal(['A', 'A', '9'])).toEqual({ total: 21, soft: true });
  });

  it('dégrade l\'as à 1 dès que le total dépasse 21', () => {
    expect(handTotal(['A', '6', 'T'])).toEqual({ total: 17, soft: false });
    expect(handTotal(['A', 'A', 'T', 'T'])).toEqual({ total: 22, soft: false });
    expect(handTotal(['T', '6', 'A'])).toEqual({ total: 17, soft: false });
  });

  it('reste cohérent quel que soit l\'ordre des cartes', () => {
    expect(handTotal(['A', '5', '7'])).toEqual(handTotal(['7', 'A', '5']));
    expect(handTotal(['A', 'A', '9', 'T'])).toEqual(handTotal(['T', '9', 'A', 'A']));
  });
});

describe('addCardToTotal', () => {
  it('est équivalent au calcul complet', () => {
    let state = { total: 0, soft: false };
    for (const card of ['A', '3', 'A', '9'] as const) {
      state = addCardToTotal(state.total, state.soft, card);
    }
    expect(state).toEqual(handTotal(['A', '3', 'A', '9']));
  });
});

describe('isBlackjack / isPair', () => {
  it('reconnaît un blackjack naturel', () => {
    expect(isBlackjack({ cards: ['A', 'T'], isSplit: false })).toBe(true);
    expect(isBlackjack({ cards: ['T', 'A'], isSplit: false })).toBe(true);
  });

  it('refuse le 21 en trois cartes et le 21 issu d\'un split', () => {
    expect(isBlackjack({ cards: ['7', '7', '7'], isSplit: false })).toBe(false);
    expect(isBlackjack({ cards: ['A', 'T'], isSplit: true })).toBe(false);
  });

  it('reconnaît les paires', () => {
    expect(isPair({ cards: ['8', '8'], isSplit: false })).toBe(true);
    // T regroupe 10/J/Q/K : deux figures forment bien une paire jouable.
    expect(isPair({ cards: ['T', 'T'], isSplit: false })).toBe(true);
    expect(isPair({ cards: ['T', '9'], isSplit: false })).toBe(false);
  });
});
