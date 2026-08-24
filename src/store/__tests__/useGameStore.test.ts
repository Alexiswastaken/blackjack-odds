import { beforeEach, describe, expect, it } from 'vitest';
import { fullShoeSize, useGameStore, MAX_PLAYERS, type CardOrigin } from '../useGameStore';
import type { CardRank } from '../../engine/types';

const store = () => useGameStore.getState();

function play(rank: CardRank, origin: CardOrigin) {
  store().playCard(rank, origin);
}

const mine = (hand = 0): CardOrigin => ({ kind: 'solo-player', hand });

beforeEach(() => {
  useGameStore.getState().resetAll();
});

describe('mémoire du sabot', () => {
  it("décrémente le sabot quelle que soit l'origine de la carte", () => {
    play('T', { kind: 'shoe' });
    play('9', mine());
    play('A', { kind: 'multi-seat', seat: 1 });

    const { shoe, history } = store();
    expect(shoe.totalRemaining).toBe(fullShoeSize(6) - 3);
    expect(shoe.remaining.T).toBe(95);
    expect(shoe.remaining['9']).toBe(23);
    expect(shoe.remaining.A).toBe(23);
    expect(history).toHaveLength(3);
  });

  it('conserve toutes les cartes vues, y compris après un changement de main', () => {
    play('T', mine());
    play('6', mine());
    store().clearHand();

    // La main est vidée mais les cartes restent sorties : elles ont été distribuées.
    expect(store().playerHands).toEqual([[]]);
    expect(store().history).toHaveLength(2);
    expect(store().shoe.remaining.T).toBe(95);
  });

  it('refuse une carte épuisée', () => {
    for (let i = 0; i < 24; i++) play('A', { kind: 'shoe' });
    expect(store().shoe.remaining.A).toBe(0);

    play('A', { kind: 'shoe' });
    expect(store().history).toHaveLength(24);
  });
});

describe('main du croupier', () => {
  it('accepte la carte cachée et tous ses tirages, pas seulement la carte visible', () => {
    play('6', { kind: 'solo-dealer' });
    play('T', { kind: 'solo-dealer' });
    play('5', { kind: 'solo-dealer' });

    expect(store().dealerCards).toEqual(['6', 'T', '5']);
    expect(store().shoe.remaining['6']).toBe(23);
    expect(store().shoe.remaining.T).toBe(95);
    expect(store().shoe.remaining['5']).toBe(23);
    expect(store().shoe.totalRemaining).toBe(fullShoeSize(6) - 3);
  });

  it('vaut aussi pour la table multi-joueurs', () => {
    play('6', { kind: 'multi-dealer' });
    play('T', { kind: 'multi-dealer' });
    play('9', { kind: 'multi-dealer' });

    expect(store().multi.dealerCards).toEqual(['6', 'T', '9']);
    expect(store().shoe.totalRemaining).toBe(fullShoeSize(6) - 3);
  });

  it('rend les cartes du croupier une par une à l\'annulation', () => {
    play('6', { kind: 'solo-dealer' });
    play('T', { kind: 'solo-dealer' });

    store().undo();
    expect(store().dealerCards).toEqual(['6']);
    expect(store().shoe.remaining.T).toBe(96);

    store().undo();
    expect(store().dealerCards).toEqual([]);
    expect(store().shoe.totalRemaining).toBe(fullShoeSize(6));
  });
});

describe('split', () => {
  it('sépare une paire en deux mains sans toucher au sabot', () => {
    play('8', mine());
    play('8', mine());
    const remainingBefore = store().shoe.totalRemaining;

    store().splitHand();

    expect(store().playerHands).toEqual([['8'], ['8']]);
    expect(store().isSplit).toBe(true);
    expect(store().activeHand).toBe(0);
    expect(store().shoe.totalRemaining).toBe(remainingBefore);
  });

  it('suit chaque main séparément', () => {
    play('8', mine());
    play('8', mine());
    store().splitHand();

    play('3', mine(0));
    store().setActiveHand(1);
    play('T', mine(1));

    expect(store().playerHands).toEqual([['8', '3'], ['8', 'T']]);
    expect(store().shoe.remaining['3']).toBe(23);
    expect(store().shoe.remaining.T).toBe(95);
  });

  it('annule la carte de la bonne main', () => {
    play('8', mine());
    play('8', mine());
    store().splitHand();
    play('3', mine(0));
    play('T', mine(1));

    store().undo();
    expect(store().playerHands).toEqual([['8', '3'], ['8']]);

    store().undo();
    expect(store().playerHands).toEqual([['8'], ['8']]);
  });

  it('refuse de splitter ce qui n\'est pas une paire', () => {
    play('8', mine());
    play('9', mine());
    store().splitHand();

    expect(store().isSplit).toBe(false);
    expect(store().playerHands).toEqual([['8', '9']]);
  });

  it('refuse de re-splitter', () => {
    play('8', mine());
    play('8', mine());
    store().splitHand();
    store().splitHand();

    expect(store().playerHands).toHaveLength(2);
  });

  it('borne la main active au domaine existant', () => {
    store().setActiveHand(5);
    expect(store().activeHand).toBe(0);
  });

  it('ignore une carte destinée à une main inexistante', () => {
    play('T', mine(3));
    expect(store().history).toEqual([]);
    expect(store().shoe.remaining.T).toBe(96);
  });

  it('est remis à plat par la main suivante', () => {
    play('8', mine());
    play('8', mine());
    store().splitHand();
    store().clearHand();

    expect(store().playerHands).toEqual([[]]);
    expect(store().isSplit).toBe(false);
    expect(store().activeHand).toBe(0);
  });
});

describe('annulation', () => {
  it('remet la carte dans le sabot et libère la place correspondante', () => {
    play('T', mine());
    play('5', { kind: 'solo-dealer' });

    store().undo();
    expect(store().dealerCards).toEqual([]);
    expect(store().shoe.remaining['5']).toBe(24);

    store().undo();
    expect(store().playerHands).toEqual([[]]);
    expect(store().shoe.remaining.T).toBe(96);
    expect(store().shoe.totalRemaining).toBe(fullShoeSize(6));
  });

  it('remet la carte dans le sabot même si la main a déjà été vidée', () => {
    play('T', mine());
    store().clearHand();

    store().undo();
    expect(store().shoe.remaining.T).toBe(96);
    expect(store().history).toHaveLength(0);
  });

  it('libère la bonne place en multi-joueurs', () => {
    play('9', { kind: 'multi-seat', seat: 2 });
    expect(store().multi.hands[2]).toEqual(['9']);

    store().undo();
    expect(store().multi.hands[2]).toEqual([]);
    expect(store().shoe.remaining['9']).toBe(24);
  });

  it('ne fait rien sur un historique vide', () => {
    store().undo();
    expect(store().shoe.totalRemaining).toBe(fullShoeSize(6));
  });
});

describe('nombre de jeux', () => {
  it("accepte n'importe quelle valeur du domaine et recrée le sabot", () => {
    for (const decks of [1, 3, 5, 12]) {
      store().setDecks(decks);
      expect(store().shoe.decks).toBe(decks);
      expect(store().shoe.totalRemaining).toBe(fullShoeSize(decks));
      expect(store().shoe.remaining.T).toBe(16 * decks);
    }
  });

  it('borne les valeurs hors domaine', () => {
    store().setDecks(0);
    expect(store().shoe.decks).toBe(1);

    store().setDecks(99);
    expect(store().shoe.decks).toBe(12);
  });

  it('efface la mémoire du sabot', () => {
    play('T', { kind: 'shoe' });
    const generation = store().shoeGeneration;

    store().setDecks(2);
    expect(store().history).toEqual([]);
    expect(store().shoeGeneration).toBe(generation + 1);
  });
});

describe('table multi-joueurs', () => {
  it('redimensionne les places en conservant les mains existantes', () => {
    store().setPlayerCount(4);
    play('T', { kind: 'multi-seat', seat: 1 });

    store().setPlayerCount(6);
    expect(store().multi.hands).toHaveLength(6);
    expect(store().multi.hands[1]).toEqual(['T']);
  });

  it('borne le nombre de joueurs', () => {
    store().setPlayerCount(0);
    expect(store().multi.playerCount).toBe(1);

    store().setPlayerCount(99);
    expect(store().multi.playerCount).toBe(MAX_PLAYERS);
  });

  it('ramène ma place et la cible active dans le domaine en rétrécissant', () => {
    store().setPlayerCount(6);
    store().setMySeat(5);
    store().setActiveTarget({ kind: 'seat', seat: 5 });

    store().setPlayerCount(2);
    expect(store().multi.mySeat).toBe(1);
    expect(store().multi.activeTarget).toEqual({ kind: 'seat', seat: 1 });
  });

  it('ignore une carte destinée à une place inexistante', () => {
    store().setPlayerCount(2);
    play('T', { kind: 'multi-seat', seat: 5 });

    expect(store().history).toEqual([]);
    expect(store().shoe.remaining.T).toBe(96);
  });

  it('vide les mains du tour sans rendre les cartes au sabot', () => {
    play('T', { kind: 'multi-seat', seat: 0 });
    play('6', { kind: 'multi-dealer' });

    store().clearRound();
    expect(store().multi.hands[0]).toEqual([]);
    expect(store().multi.dealerCards).toEqual([]);
    expect(store().shoe.remaining.T).toBe(95);
    expect(store().history).toHaveLength(2);
  });
});

describe('nouveau sabot', () => {
  it('remet tout à zéro sauf les règles et les préférences', () => {
    store().setRules({ soft17: 'H17' });
    store().setLanguage('en');
    play('T', { kind: 'shoe' });

    store().newShoe();
    expect(store().shoe.totalRemaining).toBe(fullShoeSize(6));
    expect(store().history).toEqual([]);
    expect(store().playerHands).toEqual([[]]);
    expect(store().dealerCards).toEqual([]);
    expect(store().rules.soft17).toBe('H17');
    expect(store().settings.language).toBe('en');
  });
});

describe('préférences', () => {
  it('mémorise langue et thème indépendamment', () => {
    store().setLanguage('en');
    store().setTheme('light');

    expect(store().settings).toEqual({ language: 'en', theme: 'light' });
  });

  it('sont remises par défaut par une réinitialisation complète', () => {
    store().setLanguage('en');
    store().setTheme('light');
    store().resetAll();

    expect(store().settings).toEqual({ language: 'fr', theme: 'dark' });
  });
});
