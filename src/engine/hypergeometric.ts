/**
 * Loi hypergéométrique — tirage sans remise dans le sabot restant.
 *
 * Les calculs passent par les logarithmes de factorielles : avec 8 jeux
 * (416 cartes), les coefficients binomiaux dépassent largement `Number.MAX_VALUE`
 * et un calcul direct renverrait `Infinity / Infinity = NaN`.
 */

const logFactorialCache: number[] = [0, 0];

export function logFactorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) {
    throw new Error(`logFactorial attend un entier positif, reçu ${n}`);
  }
  for (let i = logFactorialCache.length; i <= n; i++) {
    logFactorialCache[i] = logFactorialCache[i - 1] + Math.log(i);
  }
  return logFactorialCache[n];
}

/** log C(n, k). Renvoie `-Infinity` (probabilité nulle) hors du domaine. */
export function logBinomial(n: number, k: number): number {
  if (k < 0 || k > n || n < 0) return Number.NEGATIVE_INFINITY;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

export interface HypergeometricParams {
  /** Taille de la population : cartes restantes dans le sabot. */
  population: number;
  /** Nombre d'exemplaires du rang recherché encore dans le sabot. */
  successes: number;
  /** Nombre de cartes tirées. */
  draws: number;
  /** Nombre d'exemplaires recherchés parmi les cartes tirées. */
  observed: number;
}

/**
 * P(exactement `observed` succès parmi `draws` tirages) =
 * C(K, k) · C(N−K, n−k) / C(N, n)
 */
export function hypergeometric({
  population,
  successes,
  draws,
  observed,
}: HypergeometricParams): number {
  if (draws < 0 || draws > population) return 0;
  if (observed < 0 || observed > draws || observed > successes) return 0;
  if (draws - observed > population - successes) return 0;

  const logP =
    logBinomial(successes, observed) +
    logBinomial(population - successes, draws - observed) -
    logBinomial(population, draws);

  return Math.exp(logP);
}

/** Distribution complète : index `k` = P(exactement `k` succès parmi `draws`). */
export function hypergeometricDistribution(
  population: number,
  successes: number,
  draws: number,
): number[] {
  const max = Math.min(draws, successes);
  const out: number[] = [];
  for (let k = 0; k <= max; k++) {
    out.push(hypergeometric({ population, successes, draws, observed: k }));
  }
  return out;
}

/** P(au moins `observed` succès parmi `draws` tirages). */
export function hypergeometricAtLeast(
  population: number,
  successes: number,
  draws: number,
  observed: number,
): number {
  if (observed <= 0) return 1;
  let sum = 0;
  for (let k = observed; k <= Math.min(draws, successes); k++) {
    sum += hypergeometric({ population, successes, draws, observed: k });
  }
  return sum;
}

/**
 * Version multivariée : probabilité de tirer exactement la composition `wanted`
 * (un compteur par rang) parmi `sum(wanted)` cartes prises dans `counts`.
 */
export function multivariateHypergeometric(counts: readonly number[], wanted: readonly number[]): number {
  if (counts.length !== wanted.length) {
    throw new Error('counts et wanted doivent avoir la même longueur');
  }
  let population = 0;
  let draws = 0;
  let logNumerator = 0;

  for (let i = 0; i < counts.length; i++) {
    if (wanted[i] < 0 || wanted[i] > counts[i]) return 0;
    population += counts[i];
    draws += wanted[i];
    logNumerator += logBinomial(counts[i], wanted[i]);
  }

  return Math.exp(logNumerator - logBinomial(population, draws));
}
