import { describe, expect, it } from 'vitest';
import { en } from '../en';
import { fr } from '../fr';
import { translate, translatePlural, LANGUAGES } from '../index';

const PLACEHOLDER = /\{(\w+)\}/g;

function placeholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[1]).sort();
}

describe('dictionnaires', () => {
  it('couvrent exactement les mêmes clés', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it("n'ont aucune traduction vide", () => {
    for (const [language, dictionary] of [
      ['fr', fr],
      ['en', en],
    ] as const) {
      for (const [key, value] of Object.entries(dictionary)) {
        expect(value.trim(), `${language}/${key}`).not.toBe('');
      }
    }
  });

  it('utilisent les mêmes jetons d\'interpolation dans les deux langues', () => {
    const mismatches: string[] = [];
    for (const key of Object.keys(fr) as (keyof typeof fr)[]) {
      const a = placeholders(fr[key]);
      const b = placeholders(en[key]);
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        mismatches.push(`${key}: fr=[${a}] en=[${b}]`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('fournissent les deux formes de chaque pluriel', () => {
    const bases = Object.keys(fr)
      .filter((key) => key.endsWith('_one'))
      .map((key) => key.slice(0, -'_one'.length));

    expect(bases.length).toBeGreaterThan(0);
    for (const base of bases) {
      for (const dictionary of [fr, en]) {
        expect(dictionary).toHaveProperty(`${base}_one`);
        expect(dictionary).toHaveProperty(`${base}_other`);
      }
    }
  });
});

describe('translate', () => {
  it('remplace les jetons connus', () => {
    expect(translate('fr', 'card.exhausted', { rank: '10' })).toBe(
      'Plus aucun 10 dans le sabot',
    );
    expect(translate('en', 'card.exhausted', { rank: '10' })).toBe('No 10 left in the shoe');
  });

  it('laisse visible un jeton sans valeur plutôt que de créer un trou', () => {
    expect(translate('fr', 'card.exhausted')).toContain('{rank}');
  });

  it('renvoie la clé telle quelle si elle est inconnue', () => {
    // @ts-expect-error clé volontairement absente du dictionnaire
    expect(translate('fr', 'cette.cle.nexiste.pas')).toBe('cette.cle.nexiste.pas');
  });
});

describe('translatePlural', () => {
  it('choisit le singulier pour 1 et le pluriel sinon', () => {
    expect(translatePlural('fr', 'unit.deck', 1)).toBe('1 jeu');
    expect(translatePlural('fr', 'unit.deck', 6)).toBe('6 jeux');
    expect(translatePlural('en', 'unit.deck', 1)).toBe('1 deck');
    expect(translatePlural('en', 'unit.deck', 6)).toBe('6 decks');
  });

  it('traite zéro comme un pluriel dans les deux langues', () => {
    expect(translatePlural('fr', 'unit.card', 0)).toBe('0 cartes');
    expect(translatePlural('en', 'unit.card', 0)).toBe('0 cards');
  });
});

describe('langues disponibles', () => {
  it('sont toutes traduisibles', () => {
    for (const language of LANGUAGES) {
      expect(translate(language, 'app.name')).toBeTruthy();
    }
  });
});
