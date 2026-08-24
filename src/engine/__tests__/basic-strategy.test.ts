import { describe, expect, it } from 'vitest';
import { createContext } from '../context';
import { evaluate } from '../decide';
import { createShoe, drawFromShoe } from '../shoe';
import { DEFAULT_RULES, type Action, type CardRank } from '../types';

/**
 * Test de référence : sur un sabot neuf, les recommandations du moteur doivent
 * reproduire la stratégie de base publiée (6 jeux, S17, double autorisé partout,
 * double après split autorisé, pas d'abandon).
 *
 * C'est le garde-fou principal : si ce test passe, le moteur est correct sur le
 * cas où la réponse est connue, et on peut lui faire confiance sur un sabot
 * entamé — où aucune table publiée n'existe.
 */

const UPCARDS: CardRank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'A'];

const CODE_TO_ACTION: Record<string, Action> = {
  H: 'hit',
  S: 'stand',
  D: 'double',
  P: 'split',
};

/** Compositions à deux cartes utilisées pour chaque total testé. */
const HANDS: Record<string, CardRank[]> = {
  H5: ['2', '3'], H6: ['2', '4'], H7: ['2', '5'], H8: ['2', '6'],
  H9: ['2', '7'], H10: ['2', '8'], H11: ['2', '9'],
  H12: ['T', '2'], H13: ['T', '3'], H14: ['T', '4'], H15: ['T', '5'],
  H16: ['T', '6'], H17: ['T', '7'], H18: ['T', '8'], H19: ['T', '9'],
  A2: ['A', '2'], A3: ['A', '3'], A4: ['A', '4'], A5: ['A', '5'],
  A6: ['A', '6'], A7: ['A', '7'], A8: ['A', '8'], A9: ['A', '9'],
  PA: ['A', 'A'], P2: ['2', '2'], P3: ['3', '3'], P4: ['4', '4'],
  P5: ['5', '5'], P6: ['6', '6'], P7: ['7', '7'], P8: ['8', '8'],
  P9: ['9', '9'], PT: ['T', 'T'],
};

/** Stratégie de base publiée, colonnes dans l'ordre 2 3 4 5 6 7 8 9 T A. */
const BASIC_STRATEGY: Record<string, string> = {
  H5:  'HHHHHHHHHH',
  H6:  'HHHHHHHHHH',
  H7:  'HHHHHHHHHH',
  H8:  'HHHHHHHHHH',
  H9:  'HDDDDHHHHH',
  H10: 'DDDDDDDDHH',
  H11: 'DDDDDDDDDH',
  H12: 'HHSSSHHHHH',
  H13: 'SSSSSHHHHH',
  H14: 'SSSSSHHHHH',
  H15: 'SSSSSHHHHH',
  H16: 'SSSSSHHHHH',
  H17: 'SSSSSSSSSS',
  H18: 'SSSSSSSSSS',
  H19: 'SSSSSSSSSS',
  A2:  'HHHDDHHHHH',
  A3:  'HHHDDHHHHH',
  A4:  'HHDDDHHHHH',
  A5:  'HHDDDHHHHH',
  A6:  'HDDDDHHHHH',
  A7:  'SDDDDSSHHH',
  A8:  'SSSSSSSSSS',
  A9:  'SSSSSSSSSS',
  PA:  'PPPPPPPPPP',
  P2:  'PPPPPPHHHH',
  P3:  'PPPPPPHHHH',
  P4:  'HHHPPHHHHH',
  P5:  'DDDDDDDDHH',
  P6:  'PPPPPHHHHH',
  P7:  'PPPPPPHHHH',
  P8:  'PPPPPPPPPP',
  P9:  'PPPPPSPPSS',
  PT:  'SSSSSSSSSS',
};

/**
 * Écarts attendus, et corrects : la stratégie de base est *total-dépendante*,
 * le moteur est *composition-dépendant*.
 *
 * 12 contre 4 composé de 10+2 : le 10 déjà en main est un 10 de moins dans le
 * sabot, ce qui rend le croupier moins susceptible de buster et le joueur moins
 * susceptible de buster en tirant. Tirer redevient très légèrement meilleur
 * (−0.2104 contre −0.2111). C'est un écart documenté depuis Griffin ; avec un
 * 12 composé de 9+3, 8+4 ou 7+5, le moteur recommande bien « rester ».
 */
const EXPECTED_DEVIATIONS: Record<string, Action> = {
  'H12/4': 'hit',
};

function decide(cards: CardRank[], up: CardRank, ctx: ReturnType<typeof createContext>): Action {
  let shoe = createShoe(6);
  for (const card of [...cards, up]) shoe = drawFromShoe(shoe, card);
  return evaluate(shoe, { cards, isSplit: false }, up, ctx).recommended;
}

describe('stratégie de base — 6 jeux, S17, DAS', () => {
  it('reproduit la table publiée sur un sabot neuf', () => {
    // Le cascade de split ne change les EV qu'à ~1e-4 près et coûte 50x plus
    // cher ; l'équivalence est vérifiée séparément dans split.test.ts.
    const ctx = createContext({ ...DEFAULT_RULES, splitCascade: false });
    const mismatches: string[] = [];

    for (const [label, row] of Object.entries(BASIC_STRATEGY)) {
      UPCARDS.forEach((up, i) => {
        const cell = `${label}/${up}`;
        const expected = EXPECTED_DEVIATIONS[cell] ?? CODE_TO_ACTION[row[i]];
        const actual = decide(HANDS[label], up, ctx);
        if (actual !== expected) mismatches.push(`${cell}: attendu ${expected}, obtenu ${actual}`);
      });
    }

    expect(mismatches).toEqual([]);
  }, 300000);

  it('reste sur un 12 contre 4 dès que le 12 ne contient pas de 10', () => {
    const ctx = createContext({ ...DEFAULT_RULES, splitCascade: false });
    for (const cards of [['9', '3'], ['8', '4'], ['7', '5']] as CardRank[][]) {
      expect(decide(cards, '4', ctx)).toBe('stand');
    }
  }, 120000);
});

describe('stratégie de base — bascule S17 / H17', () => {
  const h17 = { ...DEFAULT_RULES, soft17: 'H17' as const, splitCascade: false };
  const s17 = { ...DEFAULT_RULES, soft17: 'S17' as const, splitCascade: false };

  it('double le 11 contre un As seulement en H17', () => {
    expect(decide(['2', '9'], 'A', createContext(s17))).toBe('hit');
    expect(decide(['2', '9'], 'A', createContext(h17))).toBe('double');
  }, 120000);

  it('double A,7 contre 2 seulement en H17', () => {
    expect(decide(['A', '7'], '2', createContext(s17))).toBe('stand');
    expect(decide(['A', '7'], '2', createContext(h17))).toBe('double');
  }, 120000);

  it('double A,8 contre 6 seulement en H17', () => {
    expect(decide(['A', '8'], '6', createContext(s17))).toBe('stand');
    expect(decide(['A', '8'], '6', createContext(h17))).toBe('double');
  }, 120000);
});

describe('règles de double', () => {
  it("n'autorise le double que sur 9-11 quand la règle le restreint", () => {
    const restricted = createContext({ ...DEFAULT_RULES, doubleOn: '9-11', splitCascade: false });
    // A,6 contre 5 : doublé en règle « any », simple tirage sinon.
    expect(decide(['A', '6'], '5', createContext({ ...DEFAULT_RULES, splitCascade: false }))).toBe('double');
    expect(decide(['A', '6'], '5', restricted)).toBe('hit');
    // Le 11 reste doublé.
    expect(decide(['2', '9'], '6', restricted)).toBe('double');
  }, 120000);

  it('ne split plus 4,4 contre 5 quand le double après split est interdit', () => {
    const noDas = createContext({ ...DEFAULT_RULES, doubleAfterSplit: false, splitCascade: false });
    expect(decide(['4', '4'], '5', createContext({ ...DEFAULT_RULES, splitCascade: false }))).toBe('split');
    expect(decide(['4', '4'], '5', noDas)).toBe('hit');
  }, 120000);
});
