/**
 * Traducerea rândului din baza de date în obiectul pe care îl primește Gemini.
 *
 * E singurul loc unde numele englezești ale coloanelor devin cheile românești pe care
 * a fost reglat promptul. Dacă se schimbă formularul, aici se face legătura.
 */
import type { Order } from '@/lib/db/schema';
import type { SongBrief } from './types';

/** Numele afișabile ale stilurilor, în ordinea din formular. Cheia e `style_id`. */
export const STYLE_NAMES: Record<string, string> = {
  romantic:  'Romantic',
  suflet:    'Din suflet',
  petrecere: 'De petrecere',
  manele:    'Manele',
  pop:       'Pop',
  rb:        'R&B / Soul',
  rap:       'Hip-Hop / Rap',
  rock:      'Rock',
  folclor:   'Folclor / Etno',
  acustic:   'Acustic',
  latino:    'Latino',
  jazz:      'Jazz / Swing',
};

export function briefFromOrder(order: Order): SongBrief {
  const destinatar =
    order.recipient === 'Altcineva' && order.recipientOther?.trim()
      ? order.recipientOther.trim()
      : (order.recipient ?? 'Cineva drag');

  const ocazie =
    order.occasion === 'Altă ocazie' && order.occasionOther?.trim()
      ? order.occasionOther.trim()
      : (order.occasion ?? 'Fără ocazie anume');

  return {
    stil: STYLE_NAMES[order.styleId ?? ''] ?? order.styleId ?? 'Pop',
    directie: order.direction ?? undefined,
    stare: order.mood ?? undefined,
    voce: order.voice === 'Femeie' ? 'Femeie' : 'Bărbat',
    destinatar,
    nume: order.names.map((n) => n.trim()).filter(Boolean),
    ocazie,
    limba: order.language,
    titlu_dorit: order.titleWanted?.trim() || undefined,
    poveste: order.story ?? '',
  };
}
