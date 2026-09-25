/**
 * Din ce țară vine clientul.
 *
 * Cloudflare, prin care trece oricum tot traficul, pune la fiecare cerere
 * antetul `CF-IPCountry` cu codul de două litere. E gratis, e deja acolo și nu
 * cere nicio cerere în plus către nimeni.
 *
 * Celelalte căi erau mai proaste, fiecare în felul ei: o bază de date GeoIP
 * cere un fișier de actualizat lunar, iar o interogare la un serviciu extern ar
 * fi însemnat să trimitem adresa IP a fiecărui client unei firme terțe — și să
 * ținem omul să aștepte după ea.
 *
 * Se citește o singură dată, la crearea comenzii, și se păstrează pe rând.
 * Antetul nu mai există când te uiți în panou peste o lună.
 */

/** Ce nu e o țară: Tor, rețele necunoscute, adrese care n-au putut fi legate. */
const NECUNOSCUTE = new Set(['XX', 'T1', '']);

/** Codul țării din anteturi, sau `null` dacă nu știm. */
export function taraDin(headers: Headers): string | null {
  const cod = (headers.get('cf-ipcountry') ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cod) || NECUNOSCUTE.has(cod)) return null;
  return cod;
}

/**
 * Steagul, construit din literele codului.
 *
 * Fiecare literă are o pereche în blocul „indicatori regionali" din Unicode,
 * iar două puse una lângă alta se desenează ca steag. Așa merge orice țară,
 * fără să ținem noi o listă de imagini.
 */
export function steag(cod: string | null): string {
  if (!cod || !/^[A-Z]{2}$/.test(cod)) return '🏳';
  return String.fromCodePoint(
    ...[...cod].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/**
 * Numele țării, în română.
 *
 * Doar cele de unde chiar vin oameni, plus vecinii și diaspora. Restul rămân cu
 * codul — mai bine „KZ" decât un nume inventat greșit.
 */
const NUME: Record<string, string> = {
  MD: 'Moldova', RO: 'România', UA: 'Ucraina', RU: 'Rusia',
  IT: 'Italia', ES: 'Spania', PT: 'Portugalia', FR: 'Franța',
  DE: 'Germania', AT: 'Austria', CH: 'Elveția', BE: 'Belgia',
  NL: 'Olanda', IE: 'Irlanda', GB: 'Marea Britanie', US: 'Statele Unite',
  CA: 'Canada', IL: 'Israel', TR: 'Turcia', GR: 'Grecia',
  PL: 'Polonia', CZ: 'Cehia', SK: 'Slovacia', HU: 'Ungaria',
  BG: 'Bulgaria', RS: 'Serbia', SE: 'Suedia', NO: 'Norvegia',
  DK: 'Danemarca', FI: 'Finlanda', CY: 'Cipru', AE: 'Emiratele Arabe Unite',
};

export function numeTara(cod: string | null): string {
  if (!cod) return 'Necunoscută';
  return NUME[cod] ?? cod;
}

/** Steagul și numele, pentru afișare într-un singur loc. */
export function tara(cod: string | null): string {
  return `${steag(cod)} ${numeTara(cod)}`;
}
