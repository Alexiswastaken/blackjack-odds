import type { CardRank, DecisionResult, Hand, Rules, ShoeState } from '../engine/types';
import type { WorkerRequest, WorkerResponse } from './protocol';

type Pending = {
  resolve: (value: never) => void;
  reject: (reason: Error) => void;
};

/**
 * Façade asynchrone du moteur.
 *
 * Une seule évaluation nous intéresse à la fois : quand l'utilisateur clique
 * rapidement, les requêtes précédentes sont abandonnées (`stale`) plutôt que
 * d'écraser un résultat plus récent à leur retour.
 */
export class EngineClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private latestEvaluateId = 0;

  constructor() {
    this.worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.handle(event.data);
    this.worker.onerror = (event) => this.failAll(new Error(event.message || 'Erreur du Worker'));
  }

  private handle(response: WorkerResponse): void {
    const pending = this.pending.get(response.id);
    if (!pending) return;
    this.pending.delete(response.id);

    if (!response.ok) {
      pending.reject(new Error(response.error));
      return;
    }
    pending.resolve((response.type === 'evaluate' ? response.result : undefined) as never);
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  private send<T>(request: WorkerRequest): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.set(request.id, { resolve: resolve as Pending['resolve'], reject });
      this.worker.postMessage(request);
    });
  }

  /**
   * Évalue une situation. Rejette avec `StaleRequestError` si une évaluation
   * plus récente a été demandée entre-temps.
   */
  async evaluate(
    shoe: ShoeState,
    hand: Hand,
    upcard: CardRank,
    rules: Rules,
  ): Promise<DecisionResult> {
    const id = this.nextId++;
    this.latestEvaluateId = id;
    const result = await this.send<DecisionResult>({ id, type: 'evaluate', shoe, hand, upcard, rules });
    if (id !== this.latestEvaluateId) throw new StaleRequestError();
    return result;
  }

  /** Vide les caches du Worker — à appeler à chaque nouveau sabot. */
  reset(): Promise<void> {
    return this.send<void>({ id: this.nextId++, type: 'reset' });
  }

  terminate(): void {
    this.worker.terminate();
    this.failAll(new Error('Worker arrêté'));
  }
}

export class StaleRequestError extends Error {
  constructor() {
    super('Requête remplacée par une plus récente');
    this.name = 'StaleRequestError';
  }
}
