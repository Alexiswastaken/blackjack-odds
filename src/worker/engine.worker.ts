/// <reference lib="webworker" />
import { cacheStats, clearCaches, createContext, type EngineContext } from '../engine/context';
import { evaluate } from '../engine/ev';
import type { Rules } from '../engine/types';
import type { WorkerRequest, WorkerResponse } from './protocol';

/**
 * Worker de calcul.
 *
 * Tout le travail lourd (récursion sur le jeu du croupier, arbres Hit / Double /
 * Split) tourne ici pour que l'interface ne gèle jamais : une évaluation avec
 * cascade de split peut prendre plusieurs centaines de millisecondes.
 */

/**
 * Au-delà de cette taille, les caches sont vidés. Les entrées restent *valides*
 * indéfiniment (elles sont indexées par composition de sabot, pas par instant),
 * mais une session longue accumulerait sinon des centaines de milliers d'états.
 */
const MAX_CACHE_ENTRIES = 3_000_000;

let context: EngineContext | null = null;
let contextRules: string | null = null;

function contextFor(rules: Rules): EngineContext {
  const signature = JSON.stringify(rules);
  // Les EV dépendent des règles : changer S17/H17 ou le DAS invalide tout.
  if (!context || contextRules !== signature) {
    context = createContext(rules);
    contextRules = signature;
    return context;
  }
  if (cacheStats(context).size > MAX_CACHE_ENTRIES) clearCaches(context);
  return context;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  const reply = (response: WorkerResponse) => self.postMessage(response);

  try {
    if (request.type === 'reset') {
      if (context) clearCaches(context);
      reply({ id: request.id, ok: true, type: 'reset' });
      return;
    }

    const ctx = contextFor(request.rules);
    const result = evaluate(request.shoe, request.hand, request.upcard, ctx);
    reply({ id: request.id, ok: true, type: 'evaluate', result });
  } catch (error) {
    reply({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
