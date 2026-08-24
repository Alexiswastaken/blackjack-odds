import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createShoe, drawFromShoe, returnToShoe } from '../engine/shoe';
import { DEFAULT_RULES, type CardRank, type Rules, type ShoeState } from '../engine/types';

/** D'où vient une carte cliquée — détermine ce que « annuler » doit défaire. */
export type CardOrigin = 'shoe' | 'player' | 'dealer';

export interface HistoryEntry {
  rank: CardRank;
  origin: CardOrigin;
}

interface GameState {
  shoe: ShoeState;
  rules: Rules;
  /** Toutes les cartes vues, dans l'ordre. Sert d'unique pile d'annulation. */
  history: HistoryEntry[];
  playerCards: CardRank[];
  dealerUpcard: CardRank | null;
  /** La main courante est-elle issue d'un split ? (interdit blackjack et re-split) */
  isSplitHand: boolean;
  /** Incrémenté à chaque nouveau sabot : sert à vider les caches du Worker. */
  shoeGeneration: number;

  playCard: (rank: CardRank, origin: CardOrigin) => void;
  undo: () => void;
  newShoe: () => void;
  setDecks: (decks: number) => void;
  setRules: (rules: Partial<Rules>) => void;
  clearHand: () => void;
  setIsSplitHand: (isSplit: boolean) => void;
  startSplitHand: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      shoe: createShoe(6),
      rules: DEFAULT_RULES,
      history: [],
      playerCards: [],
      dealerUpcard: null,
      isSplitHand: false,
      shoeGeneration: 0,

      /**
       * Enregistre une carte sortie. Le sabot est décrémenté quelle que soit
       * l'origine : une carte vue est une carte vue, peu importe à qui elle est.
       */
      playCard: (rank, origin) => {
        const state = get();
        if (state.shoe.remaining[rank] <= 0) return;
        // Une seule carte visible du croupier : il faut annuler pour la changer.
        if (origin === 'dealer' && state.dealerUpcard !== null) return;

        set({
          shoe: drawFromShoe(state.shoe, rank),
          history: [...state.history, { rank, origin }],
          playerCards: origin === 'player' ? [...state.playerCards, rank] : state.playerCards,
          dealerUpcard: origin === 'dealer' ? rank : state.dealerUpcard,
        });
      },

      /**
       * Annule la dernière carte vue : elle retourne dans le sabot, et si elle
       * occupe encore une place de la main courante, cette place est libérée.
       */
      undo: () => {
        const state = get();
        const last = state.history[state.history.length - 1];
        if (!last) return;

        const playerCards = [...state.playerCards];
        let dealerUpcard = state.dealerUpcard;

        if (last.origin === 'player' && playerCards[playerCards.length - 1] === last.rank) {
          playerCards.pop();
        } else if (last.origin === 'dealer' && dealerUpcard === last.rank) {
          dealerUpcard = null;
        }

        set({
          shoe: returnToShoe(state.shoe, last.rank),
          history: state.history.slice(0, -1),
          playerCards,
          dealerUpcard,
        });
      },

      newShoe: () =>
        set((state) => ({
          shoe: createShoe(state.shoe.decks),
          history: [],
          playerCards: [],
          dealerUpcard: null,
          isSplitHand: false,
          shoeGeneration: state.shoeGeneration + 1,
        })),

      setDecks: (decks) =>
        set((state) => ({
          shoe: createShoe(decks),
          history: [],
          playerCards: [],
          dealerUpcard: null,
          isSplitHand: false,
          shoeGeneration: state.shoeGeneration + 1,
        })),

      setRules: (rules) => set((state) => ({ rules: { ...state.rules, ...rules } })),

      /** Passe à la main suivante. Les cartes déjà vues restent hors du sabot. */
      clearHand: () => set({ playerCards: [], dealerUpcard: null, isSplitHand: false }),

      setIsSplitHand: (isSplitHand) => set({ isSplitHand }),

      /**
       * Bascule sur l'une des deux mains d'un split : on ne garde qu'une carte
       * de la paire. Le sabot n'est pas touché — les deux cartes en sont déjà
       * sorties au moment de la distribution.
       */
      startSplitHand: () =>
        set((state) => {
          const first = state.playerCards[0];
          if (!first) return {};
          return { playerCards: [first], isSplitHand: true };
        }),
    }),
    {
      name: 'blackjack-odds',
      version: 1,
      // Persiste l'état du sabot pour survivre à un rechargement accidentel.
      partialize: (state) => ({
        shoe: state.shoe,
        rules: state.rules,
        history: state.history,
        playerCards: state.playerCards,
        dealerUpcard: state.dealerUpcard,
        isSplitHand: state.isSplitHand,
        shoeGeneration: state.shoeGeneration,
      }),
    },
  ),
);

/** Nombre de cartes du sabot neuf correspondant, pour l'indicateur de pénétration. */
export function fullShoeSize(decks: number): number {
  return decks * 52;
}
