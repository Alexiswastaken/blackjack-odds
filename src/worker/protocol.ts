import type { CardRank, DecisionResult, Hand, Rules, ShoeState } from '../engine/types';

/** Messages envoyés au Worker. */
export type WorkerRequest =
  | {
      id: number;
      type: 'evaluate';
      shoe: ShoeState;
      hand: Hand;
      upcard: CardRank;
      rules: Rules;
    }
  | { id: number; type: 'reset' };

/** Réponses du Worker. */
export type WorkerResponse =
  | { id: number; ok: true; type: 'evaluate'; result: DecisionResult }
  | { id: number; ok: true; type: 'reset' }
  | { id: number; ok: false; error: string };
