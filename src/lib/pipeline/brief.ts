/**
 * Traducerea rândului din baza de date în obiectul pe care îl primește Gemini.
 *
 * E singurul loc unde numele englezești ale coloanelor devin cheile românești pe care
 * a fost reglat promptul. Dacă se schimbă formularul, aici se face legătura.
 */
import type { Order } from '@/lib/db/schema';
import { STYLE_NAMES } from './stiluri';
import type { SongBrief } from './types';

// Tabelul stilurilor stă în `stiluri.ts`; aici doar se folosește.
export { STYLE_NAMES } from './stiluri';

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
