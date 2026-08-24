/**
 * `zustand/persist` lit `window.localStorage`, et l'environnement Node n'a pas
 * de `window`. On lui en fournit un, avec un stockage en mémoire, pour que la
 * persistance soit réellement exercée par les tests plutôt que court-circuitée
 * avec un avertissement.
 *
 * Le `localStorage` global de Node n'est volontairement pas touché : y accéder
 * déclenche un avertissement expérimental qui polluerait la sortie des tests.
 */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: new MemoryStorage() },
    configurable: true,
  });
}
