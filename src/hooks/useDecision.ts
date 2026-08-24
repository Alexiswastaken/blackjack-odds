import { useEffect, useRef, useState } from 'react';
import { EngineClient, StaleRequestError } from '../worker/client';
import type { CardRank, DecisionResult } from '../engine/types';
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
 * Évalue une main dans le Worker dès qu'elle est complète.
 *
 * La main est passée en paramètre plutôt que lue dans le store : la vue solo et
 * la vue multi-joueurs évaluent des mains différentes, mais toutes deux sur le
 * *même* sabot partagé — ce qui est précisément l'intérêt de saisir les cartes
 * des autres joueurs.
 */
export function useDecisionFor(
  playerCards: CardRank[],
  dealerUpcard: CardRank | null,
  isSplitHand: boolean,
): DecisionState {
  const shoe = useGameStore((s) => s.shoe);
  const rules = useGameStore((s) => s.rules);
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
