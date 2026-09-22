/**
 * Cum se scriu numele pentru Suno, ca să le cânte cu accentul corect.
 *
 * Suno citea „Valeria" ca va-le-RI-a, în loc de va-LE-ri-a. La fel „Antonia".
 * Modelul nu știe unde cade accentul într-un nume românesc, iar pe un nume pus
 * în refren, de două ori, greșeala se aude tot cântecul.
 *
 * ── De ce aici și nu în promptul lui Gemini ──
 *
 * Pentru că versurile pe care le vede clientul și versurile pe care le cântă
 * Suno sunt același text. Dacă i-am cere lui Gemini să pună cratime sau accente,
 * clientul ar citi în pagină „Va-LE-ria" și ar crede că textul e stricat. Aici,
 * înlocuirea se face în ultima clipă, doar în ce pleacă la Suno; în pagină și în
 * email rămâne numele scris normal.
 *
 * În plus, Gemini ar pune semnele altfel de fiecare dată. Tabelul de mai jos dă
 * mereu același rezultat, iar o corectură înseamnă un rând schimbat.
 *
 * ── Cum se corectează ──
 *
 * Valorile din dreapta sunt o presupunere care se verifică DOAR cu urechea.
 * Dacă un nume încă sună prost, se schimbă forma din dreapta și se ascultă din
 * nou. Dacă un nume nu e în tabel, nu se atinge nimic — merge ca până acum.
 *
 * Două forme merită încercate, în ordinea asta:
 *   1. cratime + silaba accentuată cu majuscule:  'Va-LE-ria'
 *   2. accent ascuțit pe vocala accentuată:       'Valéria'
 */

/**
 * Numele problematice, scrise cum să le audă Suno.
 *
 * Cheia se scrie cu litere mici; potrivirea nu ține cont de majuscule.
 */
export const PRONUNTIE: Record<string, string> = {
  valeria: 'Va-LE-ria',
  antonia: 'An-TO-nia',
};

/**
 * Marginile unui cuvânt, care merg și cu diacritice.
 *
 * `\b` din JavaScript socotește doar A-Z, a-z, 0-9 și liniuța de subliniere,
 * deci ar vedea o margine de cuvânt chiar în mijlocul lui „Mădălina", între „ă"
 * și „d". Căutarea după litere, cu `\p{L}`, ține seama de tot alfabetul.
 */
const BEFORE = '(?<!\\p{L})';
const AFTER = '(?!\\p{L})';

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Versurile, pregătite pentru Suno.
 *
 * Se cheamă o singură dată, chiar înainte de trimitere, ca nicio altă cale din
 * cod să nu poată ocoli corectura din greșeală.
 */
export function pentruSuno(lyrics: string): string {
  let out = lyrics;
  for (const [nume, cantat] of Object.entries(PRONUNTIE)) {
    const re = new RegExp(`${BEFORE}${escapeRe(nume)}${AFTER}`, 'giu');
    out = out.replace(re, cantat);
  }
  return out;
}
