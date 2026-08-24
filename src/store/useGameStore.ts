import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createShoe, drawFromShoe, returnToShoe } from '../engine/shoe';
import { DEFAULT_RULES, type CardRank, type Rules, type ShoeState } from '../engine/types';

export type Language = 'fr' | 'en';
export type ThemeChoice = 'dark' | 'light' | 'system';

export const MIN_DECKS = 1;
export const MAX_DECKS = 12;
export const MAX_PLAYERS = 7;

/**
 * D'où vient une carte cliquée.
 *
 * Le sabot ne fait aucune différence — une carte vue est une carte vue — mais
 * l'origine détermine ce que « annuler » doit défaire, et permet de relire
 * l'historique en sachant à qui chaque carte est allée.
 */
export type CardOrigin =
  | { kind: 'shoe' }
  | { kind: 'solo-player' }
  | { kind: 'solo-dealer' }
  | { kind: 'multi-seat'; seat: number }
  | { kind: 'multi-dealer' };

export interface HistoryEntry {
  rank: CardRank;
  origin: CardOrigin;
}

export interface Settings {
  language: Language;
  theme: ThemeChoice;
}

/** Cible courante des clics dans la vue multi-joueurs. */
export type MultiTarget = { kind: 'seat'; seat: number } | { kind: 'dealer' };

export interface MultiTable {
  playerCount: number;
  /** Index de votre propre place : c'est cette main qui est évaluée. */
  mySeat: number;
  activeTarget: MultiTarget;
  hands: CardRank[][];
  dealerUpcard: CardRank | null;
}

interface GameState {
  shoe: ShoeState;
  rules: Rules;
  /** Toutes les cartes vues depuis le mélange, dans l'ordre. */
  history: HistoryEntry[];
  /** Incrémenté à chaque nouveau sabot : sert à vider les caches du Worker. */
  shoeGeneration: number;

  playerCards: CardRank[];
  dealerUpcard: CardRank | null;
  isSplitHand: boolean;

  multi: MultiTable;
  settings: Settings;

  playCard: (rank: CardRank, origin: CardOrigin) => void;
  undo: () => void;
  newShoe: () => void;
  setDecks: (decks: number) => void;
  setRules: (rules: Partial<Rules>) => void;

  clearHand: () => void;
  setIsSplitHand: (isSplit: boolean) => void;
  startSplitHand: () => void;

  setPlayerCount: (count: number) => void;
  setMySeat: (seat: number) => void;
  setActiveTarget: (target: MultiTarget) => void;
  clearRound: () => void;

  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemeChoice) => void;
  resetAll: () => void;
}

function emptyTable(playerCount = 3): MultiTable {
  return {
    playerCount,
    mySeat: 0,
    activeTarget: { kind: 'seat', seat: 0 },
    hands: Array.from({ length: playerCount }, () => []),
    dealerUpcard: null,
  };
}

/** Remet les mains à zéro sans toucher au sabot : les cartes ont été distribuées. */
function clearedTable(table: MultiTable): MultiTable {
  return {
    ...table,
    hands: table.hands.map(() => []),
    dealerUpcard: null,
    activeTarget: { kind: 'seat', seat: table.mySeat },
  };
}

const DEFAULT_SETTINGS: Settings = { language: 'fr', theme: 'dark' };

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      shoe: createShoe(6),
      rules: DEFAULT_RULES,
      history: [],
      shoeGeneration: 0,

      playerCards: [],
      dealerUpcard: null,
      isSplitHand: false,

      multi: emptyTable(),
      settings: DEFAULT_SETTINGS,

      /**
       * Enregistre une carte sortie. Le sabot est décrémenté quelle que soit
       * l'origine : c'est cette mémoire cumulée qui rend les probabilités
       * exactes plutôt qu'approchées.
       */
      playCard: (rank, origin) => {
        const state = get();
        if (state.shoe.remaining[rank] <= 0) return;

        // Une seule carte visible du croupier : il faut annuler pour la changer.
        if (origin.kind === 'solo-dealer' && state.dealerUpcard !== null) return;
        if (origin.kind === 'multi-dealer' && state.multi.dealerUpcard !== null) return;
        if (origin.kind === 'multi-seat' && !state.multi.hands[origin.seat]) return;

        const next: Partial<GameState> = {
          shoe: drawFromShoe(state.shoe, rank),
          history: [...state.history, { rank, origin }],
        };

        if (origin.kind === 'solo-player') next.playerCards = [...state.playerCards, rank];
        if (origin.kind === 'solo-dealer') next.dealerUpcard = rank;
        if (origin.kind === 'multi-dealer') {
          next.multi = { ...state.multi, dealerUpcard: rank };
        }
        if (origin.kind === 'multi-seat') {
          next.multi = {
            ...state.multi,
            hands: state.multi.hands.map((hand, index) =>
              index === origin.seat ? [...hand, rank] : hand,
            ),
          };
        }

        set(next as GameState);
      },

      /**
       * Annule la dernière carte vue : elle retourne dans le sabot, et si elle
       * occupe encore une place d'une main courante, cette place est libérée.
       *
       * L'annulation reste tolérante : après un « nouveau tour », les mains ont
       * été vidées mais l'historique demeure, et la carte doit quand même
       * pouvoir revenir dans le sabot.
       */
      undo: () => {
        const state = get();
        const last = state.history[state.history.length - 1];
        if (!last) return;

        const next: Partial<GameState> = {
          shoe: returnToShoe(state.shoe, last.rank),
          history: state.history.slice(0, -1),
        };

        const { origin, rank } = last;
        if (
          origin.kind === 'solo-player' &&
          state.playerCards[state.playerCards.length - 1] === rank
        ) {
          next.playerCards = state.playerCards.slice(0, -1);
        } else if (origin.kind === 'solo-dealer' && state.dealerUpcard === rank) {
          next.dealerUpcard = null;
        } else if (origin.kind === 'multi-dealer' && state.multi.dealerUpcard === rank) {
          next.multi = { ...state.multi, dealerUpcard: null };
        } else if (origin.kind === 'multi-seat') {
          const hand = state.multi.hands[origin.seat];
          if (hand && hand[hand.length - 1] === rank) {
            next.multi = {
              ...state.multi,
              hands: state.multi.hands.map((h, index) =>
                index === origin.seat ? h.slice(0, -1) : h,
              ),
            };
          }
        }

        set(next as GameState);
      },

      newShoe: () =>
        set((state) => ({
          shoe: createShoe(state.shoe.decks),
          history: [],
          playerCards: [],
          dealerUpcard: null,
          isSplitHand: false,
          multi: clearedTable(state.multi),
          shoeGeneration: state.shoeGeneration + 1,
        })),

      setDecks: (decks) =>
        set((state) => ({
          shoe: createShoe(Math.min(MAX_DECKS, Math.max(MIN_DECKS, Math.round(decks)))),
          history: [],
          playerCards: [],
          dealerUpcard: null,
          isSplitHand: false,
          multi: clearedTable(state.multi),
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

      setPlayerCount: (count) =>
        set((state) => {
          const playerCount = Math.min(MAX_PLAYERS, Math.max(1, Math.round(count)));
          const hands = Array.from(
            { length: playerCount },
            (_, index) => state.multi.hands[index] ?? [],
          );
          const mySeat = Math.min(state.multi.mySeat, playerCount - 1);
          const active = state.multi.activeTarget;
          return {
            multi: {
              ...state.multi,
              playerCount,
              hands,
              mySeat,
              activeTarget:
                active.kind === 'seat' && active.seat >= playerCount
                  ? { kind: 'seat', seat: mySeat }
                  : active,
            },
          };
        }),

      setMySeat: (seat) =>
        set((state) => ({
          multi: {
            ...state.multi,
            mySeat: Math.min(state.multi.playerCount - 1, Math.max(0, seat)),
          },
        })),

      setActiveTarget: (activeTarget) =>
        set((state) => ({ multi: { ...state.multi, activeTarget } })),

      clearRound: () => set((state) => ({ multi: clearedTable(state.multi) })),

      setLanguage: (language) =>
        set((state) => ({ settings: { ...state.settings, language } })),

      setTheme: (theme) => set((state) => ({ settings: { ...state.settings, theme } })),

      /** Repart de zéro, préférences comprises. */
      resetAll: () =>
        set((state) => ({
          shoe: createShoe(6),
          rules: DEFAULT_RULES,
          history: [],
          playerCards: [],
          dealerUpcard: null,
          isSplitHand: false,
          multi: emptyTable(),
          settings: DEFAULT_SETTINGS,
          shoeGeneration: state.shoeGeneration + 1,
        })),
    }),
    {
      name: 'blackjack-odds',
      version: 2,
      // Persiste l'état du sabot pour survivre à un rechargement accidentel.
      partialize: (state) => ({
        shoe: state.shoe,
        rules: state.rules,
        history: state.history,
        shoeGeneration: state.shoeGeneration,
        playerCards: state.playerCards,
        dealerUpcard: state.dealerUpcard,
        isSplitHand: state.isSplitHand,
        multi: state.multi,
        settings: state.settings,
      }),
      migrate: (persisted, version) => {
        const state = persisted as Partial<GameState> & {
          history?: { rank: CardRank; origin: unknown }[];
        };

        // v1 stockait l'origine sous forme de chaîne et ignorait la table multi.
        if (version < 2) {
          const legacy: Record<string, CardOrigin> = {
            shoe: { kind: 'shoe' },
            player: { kind: 'solo-player' },
            dealer: { kind: 'solo-dealer' },
          };
          state.history = (state.history ?? []).map((entry) => ({
            rank: entry.rank,
            origin:
              typeof entry.origin === 'string'
                ? (legacy[entry.origin] ?? { kind: 'shoe' })
                : (entry.origin as CardOrigin),
          }));
          state.multi = emptyTable();
          state.settings = DEFAULT_SETTINGS;
        }

        return state as GameState;
      },
    },
  ),
);

/** Nombre de cartes du sabot neuf correspondant, pour l'indicateur de pénétration. */
export function fullShoeSize(decks: number): number {
  return decks * 52;
}
