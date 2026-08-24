import { describe, expect, it } from 'vitest';
import {
  hypergeometric,
  hypergeometricAtLeast,
  hypergeometricDistribution,
  logBinomial,
  multivariateHypergeometric,
} from '../hypergeometric';
import { createShoe, toCounts } from '../shoe';

describe('logBinomial', () => {
  it('retrouve les petits coefficients binomiaux', () => {
    expect(Math.exp(logBinomial(5, 2))).toBeCloseTo(10, 10);
    expect(Math.exp(logBinomial(52, 5))).toBeCloseTo(2_598_960, 3);
  });

  it('renvoie une probabilité nulle hors domaine', () => {
    expect(logBinomial(3, 5)).toBe(Number.NEGATIVE_INFINITY);
    expect(logBinomial(3, -1)).toBe(Number.NEGATIVE_INFINITY);
  });
});

describe('hypergeometric', () => {
  it('correspond au calcul à la main', () => {
    // C(4,2)·C(6,1)/C(10,3) = 6·6/120 = 0.3
    expect(hypergeometric({ population: 10, successes: 4, draws: 3, observed: 2 })).toBeCloseTo(
      0.3,
      12,
    );
  });

  it('se réduit à R_v / R pour un seul tirage', () => {
    const shoe = createShoe(6);
    expect(hypergeometric({ population: 312, successes: 96, draws: 1, observed: 1 })).toBeCloseTo(
      shoe.remaining.T / shoe.totalRemaining,
      12,
    );
  });

  it('reste stable sur un sabot de 8 jeux (416 cartes)', () => {
    // Le calcul direct des binomiaux déborderait ici : C(416, 20) > 1e35.
    const p = hypergeometric({ population: 416, successes: 128, draws: 20, observed: 6 });
    expect(Number.isFinite(p)).toBe(true);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it('renvoie 0 pour les cas impossibles', () => {
    expect(hypergeometric({ population: 10, successes: 2, draws: 3, observed: 3 })).toBe(0);
    expect(hypergeometric({ population: 10, successes: 4, draws: 3, observed: -1 })).toBe(0);
    // Trop peu d'échecs disponibles : 8 tirages dont 1 succès exigerait 7 échecs sur 6.
    expect(hypergeometric({ population: 10, successes: 4, draws: 8, observed: 1 })).toBe(0);
  });

  it('produit une distribution qui somme à 1', () => {
    const dist = hypergeometricDistribution(312, 96, 5);
    const sum = dist.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 12);
  });

  it('cumule correctement avec atLeast', () => {
    const population = 52;
    const successes = 16;
    const draws = 4;
    const exactly0 = hypergeometric({ population, successes, draws, observed: 0 });
    expect(hypergeometricAtLeast(population, successes, draws, 1)).toBeCloseTo(1 - exactly0, 12);
    expect(hypergeometricAtLeast(population, successes, draws, 0)).toBe(1);
  });
});

describe('multivariateHypergeometric', () => {
  it('correspond au calcul à la main', () => {
    // C(4,1)·C(4,1)/C(8,2) = 16/28
    expect(multivariateHypergeometric([4, 4], [1, 1])).toBeCloseTo(16 / 28, 12);
  });

  it("coïncide avec la version univariée quand un seul rang est visé", () => {
    const counts = toCounts(createShoe(1));
    const wanted = counts.map(() => 0);
    wanted[0] = 2; // deux as
    // Tirer 2 cartes dont exactement 2 as.
    expect(multivariateHypergeometric(counts, wanted)).toBeCloseTo(
      hypergeometric({ population: 52, successes: 4, draws: 2, observed: 2 }),
      12,
    );
  });

  it('renvoie 0 si on demande plus de cartes qu\'il n\'en reste', () => {
    expect(multivariateHypergeometric([4, 4], [5, 0])).toBe(0);
  });
});
