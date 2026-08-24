import type { CardOrigin } from '../store/useGameStore';
import type { Translator } from '../i18n';

/** Libellé lisible d'une origine de carte, pour l'historique et les info-bulles. */
export function originLabel(origin: CardOrigin, t: Translator, mySeat: number): string {
  switch (origin.kind) {
    case 'shoe':
      return t.t('origin.shoe');
    case 'solo-player':
      return t.t('origin.solo.player');
    case 'solo-dealer':
      return t.t('origin.solo.dealer');
    case 'multi-dealer':
      return t.t('origin.multi.dealer');
    case 'multi-seat':
      return origin.seat === mySeat
        ? t.t('origin.multi.me')
        : t.t('origin.multi.seat', { seat: origin.seat + 1 });
  }
}

/** Couleur associée : votre main en bleu, le croupier en ambre, les autres neutres. */
export function originTone(origin: CardOrigin, mySeat: number): string {
  switch (origin.kind) {
    case 'solo-player':
      return 'bg-info-soft text-info-ink';
    case 'solo-dealer':
    case 'multi-dealer':
      return 'bg-warn-soft text-warn-ink';
    case 'multi-seat':
      return origin.seat === mySeat ? 'bg-info-soft text-info-ink' : 'bg-alt-soft text-alt-ink';
    case 'shoe':
      return 'bg-raised text-ink-muted';
  }
}
