import { useEffect, useRef, useState } from 'react';
import { EngineClient, StaleRequestError } from '../worker/client';
import type { DecisionResult } from '../engine/types';
import { useGameStore } from '../store/useGameStore';

/**
 * Client unique, créé à la demande.
 *
 * Un singleton de module plutôt qu'une ref de composant : en `StrictMode` React
 * monte, démonte puis remonte chaque composant en développement, ce qui
 * détruirait et recréerait le Worker — et viderait son cache — à chaque fois.
 */
let client: EngineClient | null = null;
function getClient(): EngineClient {
  if (!client) client = new EngineClient();
  return client;
}

export type DecisionStatus = 'incomplete' | 'computing' | 'ready' | 'error';

export interface DecisionState {
  status: DecisionStatus;
  result: DecisionResult | null;
  error: string | null;
}

/**
 * Évalue la main courante dans le Worker dès qu'elle est complète.
 *
 * Chaque changement de sabot, de main ou de règles relance un calcul ; les
 * résultats périmés sont ignorés au retour.
 */
export function useDecision(): DecisionState {
  const shoe = useGameStore((s) => s.shoe);
  const rules = useGameStore((s) => s.rules);
  const playerCards = useGameStore((s) => s.playerCards);
  const dealerUpcard = useGameStore((s) => s.dealerUpcard);
  const isSplitHand = useGameStore((s) => s.isSplitHand);
  const shoeGeneration = useGameStore((s) => s.shoeGeneration);

  const [state, setState] = useState<DecisionState>({
    status: 'incomplete',
    result: null,
    error: null,
  });

  // Un nouveau sabot vide les caches : ils ne sont plus jamais sollicités.
  const lastGeneration = useRef(shoeGeneration);
  useEffect(() => {
    if (lastGeneration.current === shoeGeneration) return;
    lastGeneration.current = shoeGeneration;
    void getClient().reset();
  }, [shoeGeneration]);

  const complete = playerCards.length >= 2 && dealerUpcard !== null;

  useEffect(() => {
    if (!complete || dealerUpcard === null) {
      setState({ status: 'incomplete', result: null, error: null });
      return;
    }

    let cancelled = false;
    setState((previous) => ({ ...previous, status: 'computing', error: null }));

    getClient()
      .evaluate(shoe, { cards: playerCards, isSplit: isSplitHand }, dealerUpcard, rules)
      .then((result) => {
        if (!cancelled) setState({ status: 'ready', result, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled || error instanceof StaleRequestError) return;
        setState({
          status: 'error',
          result: null,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [complete, shoe, playerCards, dealerUpcard, isSplitHand, rules]);

  return state;
}
