/**
 * Plata, într-un singur fișier.
 *
 * Aici se schimbă procesatorul. Restul codului nu știe cine încasează: ruta de
 * checkout cere o adresă, primește o adresă, atât. A treia mutare înseamnă
 * rescris fișierul ăsta, nu căutat prin tot proiectul — asta s-a plătit deja o
 * dată, la trecerea de la Paddle la Lemon Squeezy.
 *
 * Acum încasăm pe un link fix de la MAIB, iar deblocarea o face omul, de pe
 * Telegram, după ce vede banii. Nu e eleganță, e singurul mod de a vinde până
 * se leagă Paynet — și are un avantaj pe care o integrare automată nu-l are:
 * nu poate debloca nimic din greșeală, pentru că nimic nu se deblochează fără
 * ca cineva să apese un buton.
 *
 * Ce nu poate face linkul fix, și trebuie știut: nu poartă identificatorul
 * comenzii. MAIB ne spune că au intrat 30 €, nu de la care comandă. Puntea e
 * adresa de email, pe care clientul o completează și la noi, și la MAIB — de
 * asta i-o cerem apăsat pe ecranul de plată.
 */
import { env } from '@/lib/env';

/** Numele sub care se scriu plățile în baza de date. */
export const PROVIDER = 'maib';

/**
 * Se poate plăti? Dacă nu, butonul spune că plata se activează în curând, în
 * loc să deschidă o pagină goală.
 */
export function paymentsEnabled(): boolean {
  return Boolean(env.MAIB_PAY_URL);
}

export interface CheckoutSession {
  /** Adresa de plată. Browserul o deschide într-o filă nouă. */
  url: string;
  /**
   * Identificatorul pe care clientul îl are sub ochi cât plătește.
   *
   * Nu ajunge la MAIB — linkul nu are unde să-l ducă. E acolo ca omul să-l
   * poată spune la telefon sau pe email dacă ceva nu se potrivește.
   */
  orderRef: string;
  /** Prețul, ca să-l arate pagina fără să-l aibă scris a doua oară. */
  priceEur: number;
}

/**
 * Pregătește plata pentru o comandă.
 *
 * Nu cere nimic de la nimeni și nu poate eșua din cauza rețelei: linkul e fix,
 * stă în `.env`. Întoarcerea unui obiect, și nu a unui șir, e ca ruta să nu se
 * schimbe când vine Paynet și adresa devine una generată pentru fiecare comandă.
 */
export function createCheckout(publicId: string): CheckoutSession {
  if (!paymentsEnabled()) {
    throw new Error('Lipsește MAIB_PAY_URL din .env — plata nu poate fi pornită.');
  }
  return {
    url: env.MAIB_PAY_URL,
    orderRef: publicId,
    priceEur: env.SONG_PRICE_EUR,
  };
}
