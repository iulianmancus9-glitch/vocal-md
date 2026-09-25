/**
 * Cum se citesc în panou lucrurile pe care baza de date le ține în engleză.
 *
 * Tabelele vorbesc în `preview_ready` și `lyrics_refused` pentru că așa sunt
 * scrise coloanele. Panoul e citit de un om care nu a scris codul, deci aici
 * fiecare stare are un nume în română și o culoare.
 *
 * Culoarea nu e decor: la douăzeci de comenzi pe ecran, ea e singurul lucru
 * care se vede dintr-o privire. Verde = bani încasați. Galben = te așteaptă
 * pe tine. Roșu = s-a oprit. Violet = lucrează.
 */

export type Ton = 'paid' | 'wait' | 'bad' | 'work' | 'idle';

export interface Stare {
  nume: string;
  ton: Ton;
}

export const STARI: Record<string, Stare> = {
  draft: { nume: 'A completat formularul', ton: 'idle' },
  lyrics_pending: { nume: 'Se scriu versurile', ton: 'work' },
  lyrics_ready: { nume: 'A primit versurile', ton: 'idle' },
  rendering: { nume: 'Se înregistrează', ton: 'work' },
  preview_ready: { nume: 'Ascultă melodia', ton: 'idle' },
  payment_claimed: { nume: 'Spune că a plătit', ton: 'wait' },
  paid: { nume: 'A plătit', ton: 'paid' },
  delivered: { nume: 'A primit melodia', ton: 'paid' },
  refused: { nume: 'Refuzată (conținut)', ton: 'bad' },
  failed: { nume: 'Eroare tehnică', ton: 'bad' },
  expired: { nume: 'Expirată', ton: 'bad' },
};

export function stare(status: string): Stare {
  return STARI[status] ?? { nume: status, ton: 'idle' };
}

/** Ce s-a întâmplat, în urma auditabilă. */
export const EVENIMENTE: Record<string, string> = {
  order_created: 'A trimis formularul',
  lyrics_generated: 'S-au scris versurile',
  lyrics_regenerated: 'A cerut alte versuri',
  lyrics_edited: 'A modificat textul',
  lyrics_restored: 'A readus o variantă veche',
  lyrics_approved: 'A aprobat versurile',
  lyrics_refused: 'Versurile au fost refuzate',
  render_started: 'A intrat la înregistrare',
  preview_ready: 'Melodia e gata de ascultat',
  recording_chosen: 'A ales altă înregistrare',
  checkout_opened: 'A deschis linkul de plată',
  checkout_failed: 'Plata nu s-a putut deschide',
  payment_claimed: 'A spus că a plătit',
  payment_rejected: 'Plata a fost respinsă',
  paid: 'Plata a fost confirmată',
  refunded: 'S-a rambursat',
  delivered: 'S-a trimis melodia',
  limits_reset: 'I s-au șters limitele',
};

export function eveniment(type: string): string {
  return EVENIMENTE[type] ?? type;
}

/** Sursa unei variante de versuri. */
export const SURSE: Record<string, string> = {
  ai: 'scrise de AI',
  ai_regen: 'variantă nouă cerută',
  user_edit: 'modificate de client',
  user_provided: 'aduse de client',
};

/** Data și ora, scurt, în felul de acasă. */
export function cand(d: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('ro-RO', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Chisinau',
  });
}

/** Cât timp a trecut, pentru lista de comenzi: „acum 3 ore" spune mai mult
 *  decât o dată exactă când te uiți ce s-a întâmplat azi. */
export function acum(d: Date | string | null): string {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'acum';
  if (s < 3600) return `acum ${Math.floor(s / 60)} min`;
  if (s < 86400) return `acum ${Math.floor(s / 3600)} h`;
  const zile = Math.floor(s / 86400);
  if (zile === 1) return 'ieri';
  if (zile < 30) return `acum ${zile} zile`;
  return cand(d).slice(0, 8);
}
