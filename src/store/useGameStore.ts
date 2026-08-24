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
  | { kind: 'solo-player'; hand: number }
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
  /** Main complète du croupier : la première carte est la carte visible. */
  dealerCards: CardRank[];
}

interface GameState {
  shoe: ShoeState;
  rules: Rules;
  /** Toutes les cartes vues depuis le mélange, dans l'ordre. */
  history: HistoryEntry[];
  /** Incrémenté à chaque nouveau sabot : sert à vider les caches du Worker. */
  shoeGeneration: number;

  /** Une main, ou deux après un split. */
  playerHands: CardRank[][];
  activeHand: number;
  isSplit: boolean;
  /** Main complète du croupier : la première carte est la carte visible. */
  dealerCards: CardRank[];

  multi: MultiTable;
  settings: Settings;

  playCard: (rank: CardRank, origin: CardOrigin) => void;
  undo: () => void;
  newShoe: () => void;
  setDecks: (decks: number) => void;
  setRules: (rules: Partial<Rules>) => void;

  clearHand: () => void;
  splitHand: () => void;
  setActiveHand: (index: number) => void;

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
    dealerCards: [],
  };
}

/** Remet les mains à zéro sans toucher au sabot : les cartes ont été distribuées. */
function clearedTable(table: MultiTable): MultiTable {
  return {
    ...table,
    hands: table.hands.map(() => []),
    dealerCards: [],
    activeTarget: { kind: 'seat', seat: table.mySeat },
  };
}

const DEFAULT_SETTINGS: Settings = { language: 'fr', theme: 'dark' };

const EMPTY_SOLO = {
  playerHands: [[]] as CardRank[][],
  activeHand: 0,
  isSplit: false,
  dealerCards: [] as CardRank[],
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      shoe: createShoe(6),
      rules: DEFAULT_RULES,
      history: [],
      shoeGeneration: 0,

      ...EMPTY_SOLO,
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
        if (origin.kind === 'solo-player' && !state.playerHands[origin.hand]) return;
        if (origin.kind === 'multi-seat' && !state.multi.hands[origin.seat]) return;

        const next: Partial<GameState> = {
          shoe: drawFromShoe(state.shoe, rank),
          history: [...state.history, { rank, origin }],
        };

        if (origin.kind === 'solo-player') {
          next.playerHands = state.playerHands.map((hand, index) =>
            index === origin.hand ? [...hand, rank] : hand,
          );
        }
        // Le croupier reçoit autant de cartes qu'il en tire : la carte visible,
        // puis la carte cachée révélée et tous ses tirages.
        if (origin.kind === 'solo-dealer') next.dealerCards = [...state.dealerCards, rank];
        if (origin.kind === 'multi-dealer') {
          next.multi = { ...state.multi, dealerCards: [...state.multi.dealerCards, rank] };
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
        const endsWith = (cards: CardRank[] | undefined) =>
          cards !== undefined && cards[cards.length - 1] === rank;

        if (origin.kind === 'solo-player' && endsWith(state.playerHands[origin.hand])) {
          next.playerHands = state.playerHands.map((hand, index) =>
            index === origin.hand ? hand.slice(0, -1) : hand,
          );
        } else if (origin.kind === 'solo-dealer' && endsWith(state.dealerCards)) {
          next.dealerCards = state.dealerCards.slice(0, -1);
        } else if (origin.kind === 'multi-dealer' && endsWith(state.multi.dealerCards)) {
          next.multi = { ...state.multi, dealerCards: state.multi.dealerCards.slice(0, -1) };
        } else if (origin.kind === 'multi-seat' && endsWith(state.multi.hands[origin.seat])) {
          next.multi = {
            ...state.multi,
            hands: state.multi.hands.map((hand, index) =>
              index === origin.seat ? hand.slice(0, -1) : hand,
            ),
          };
        }

        set(next as GameState);
      },

      newShoe: () =>
        set((state) => ({
          shoe: createShoe(state.shoe.decks),
          history: [],
          ...EMPTY_SOLO,
          multi: clearedTable(state.multi),
          shoeGeneration: state.shoeGeneration + 1,
        })),

      setDecks: (decks) =>
        set((state) => ({
          shoe: createShoe(Math.min(MAX_DECKS, Math.max(MIN_DECKS, Math.round(decks)))),
          history: [],
          ...EMPTY_SOLO,
          multi: clearedTable(state.multi),
          shoeGeneration: state.shoeGeneration + 1,
        })),

      setRules: (rules) => set((state) => ({ rules: { ...state.rules, ...rules } })),

      /** Passe à la main suivante. Les cartes déjà vues restent hors du sabot. */
      clearHand: () => set({ ...EMPTY_SOLO }),

      /**
       * Sépare une paire en deux mains, chacune gardant une carte.
       *
       * Le sabot n'est pas touché : les deux cartes en sont déjà sorties au
       * moment de la distribution. Les deux mains sont ensuite suivies et
       * conseillées séparément — elles se règlent indépendamment.
       */
      splitHand: () =>
        set((state) => {
          if (state.isSplit || state.playerHands.length !== 1) return {};
          const [hand] = state.playerHands;
          if (hand.length !== 2 || hand[0] !== hand[1]) return {};
          return {
            playerHands: [[hand[0]], [hand[1]]],
            activeHand: 0,
            isSplit: true,
          };
        }),

      setActiveHand: (index) =>
        set((state) => ({
          activeHand: Math.min(state.playerHands.length - 1, Math.max(0, index)),
        })),

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
          ...EMPTY_SOLO,
          multi: emptyTable(),
          settings: DEFAULT_SETTINGS,
          shoeGeneration: state.shoeGeneration + 1,
        })),
    }),
    {
      name: 'blackjack-odds',
      version: 3,
      // Persiste l'état du sabot pour survivre à un rechargement accidentel.
      partialize: (state) => ({
        shoe: state.shoe,
        rules: state.rules,
        history: state.history,
        shoeGeneration: state.shoeGeneration,
        playerHands: state.playerHands,
        activeHand: state.activeHand,
        isSplit: state.isSplit,
        dealerCards: state.dealerCards,
        multi: state.multi,
        settings: state.settings,
      }),
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>;

        // v1 stockait l'origine sous forme de chaîne et ignorait la table multi.
        if (version < 2) {
          const legacy: Record<string, CardOrigin> = {
            shoe: { kind: 'shoe' },
            player: { kind: 'solo-player', hand: 0 },
            dealer: { kind: 'solo-dealer' },
          };
          state.history = ((state.history as { rank: CardRank; origin: unknown }[]) ?? []).map(
            (entry) => ({
              rank: entry.rank,
              origin:
                typeof entry.origin === 'string'
                  ? (legacy[entry.origin] ?? { kind: 'shoe' })
                  : (entry.origin as CardOrigin),
            }),
          );
          state.multi = emptyTable();
          state.settings = DEFAULT_SETTINGS;
        }

        // v2 n'avait qu'une main de joueur et une seule carte de croupier.
        if (version < 3) {
          const legacyHand = (state.playerCards as CardRank[] | undefined) ?? [];
          state.playerHands = [legacyHand];
          state.activeHand = 0;
          state.isSplit = Boolean(state.isSplitHand);
          const upcard = state.dealerUpcard as CardRank | null | undefined;
          state.dealerCards = upcard ? [upcard] : [];
          delete state.playerCards;
          delete state.isSplitHand;
          delete state.dealerUpcard;

          const multi = state.multi as (MultiTable & { dealerUpcard?: CardRank | null }) | undefined;
          if (multi) {
            multi.dealerCards = multi.dealerUpcard ? [multi.dealerUpcard] : [];
            delete multi.dealerUpcard;
          }

          // L'historique v2 ne portait pas d'index de main.
          state.history = ((state.history as HistoryEntry[]) ?? []).map((entry) =>
            entry.origin.kind === 'solo-player'
              ? { ...entry, origin: { kind: 'solo-player', hand: 0 } }
              : entry,
          );
        }

        return state as unknown as GameState;
      },
    },
  ),
);

/** Nombre de cartes du sabot neuf correspondant, pour l'indicateur de pénétration. */
export function fullShoeSize(decks: number): number {
  return decks * 52;
}
