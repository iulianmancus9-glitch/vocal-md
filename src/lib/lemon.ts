/**
 * Legătura cu Lemon Squeezy.
 *
 * Checkout-ul se creează pe server, nu în browser: prețul și identificatorul
 * comenzii sunt puse de noi. Dacă browserul ar alege prețul, oricine l-ar putea
 * schimba înainte să apese „plătește".
 *
 * Lemon Squeezy e comerciant înregistrat (merchant of record), deci el se ocupă
 * de TVA și de facturi. Noi răspundem la o singură întrebare: are dreptul
 * comanda asta la fișierele integrale?
 *
 * Am venit aici de la Paddle, care ne-a refuzat domeniul de cinci ori. Motivul
 * era în prima frază a politicii lor: „Paddle is built to serve software
 * companies". Noi vindem fișiere audio, nu software. Lemon Squeezy scrie
 * „photos, audio, video" printre lucrurile pe care le acceptă.
 */
import { env } from '@/lib/env';
import type { Order } from '@/lib/db/schema';

const API = 'https://api.lemonsqueezy.com/v1';

/** Plata e configurată complet? Dacă nu, butonul spune că se activează în curând. */
export function paymentsEnabled(): boolean {
  return Boolean(env.LEMON_API_KEY && env.LEMON_STORE_ID && env.LEMON_VARIANT_ID);
}

export interface CheckoutSession {
  /** Adresa ferestrei de plată. Browserul o deschide peste pagină. */
  url: string;
  /** Identificatorul checkout-ului, doar ca urmă în jurnal. */
  checkoutId: string;
}

interface CheckoutResponse {
  data?: { id?: string; attributes?: { url?: string } };
  errors?: { detail?: string }[];
}

/**
 * Deschide o plată pentru comanda dată.
 *
 * `custom.order_id` e singura legătură dintre plata lor și rândul nostru din
 * bază: se întoarce în `meta.custom_data` la webhook. Fără el n-am ști pe cine
 * să deblocăm.
 */
export async function createCheckout(order: Order): Promise<CheckoutSession> {
  if (!paymentsEnabled()) {
    throw new Error('Lipsesc cheile Lemon Squeezy din .env — plata nu poate fi pornită.');
  }

  const res = await fetch(`${API}/checkouts`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${env.LEMON_API_KEY}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            ...(order.email ? { email: order.email } : {}),
            custom: { order_id: order.publicId },
          },
          // Fără asta, adresa deschide o pagină proprie în loc să apară peste a
          // noastră, iar omul pierde din ochi melodia pe care tocmai a ascultat-o.
          checkout_options: { embed: true, dark: false },
          product_options: {
            /**
             * Adresa de întoarcere poartă secretul comenzii, ca linkurile din
             * email.
             *
             * Fără el, pagina s-ar baza pe cookie-ul comenzii — iar cookie-ul e
             * `SameSite=lax`, care nu se trimite la o navigare dintr-un cadru.
             * Fereastra de plată e un cadru, deci omul se întorcea de la plată
             * pe un 404, cu melodia plătită și inaccesibilă.
             */
            redirect_url:
              `${env.APP_URL}/comanda/${order.publicId}?t=${order.accessToken}`,
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: String(env.LEMON_STORE_ID) } },
          variant: { data: { type: 'variants', id: String(env.LEMON_VARIANT_ID) } },
        },
      },
    }),
  });

  const body = (await res.json().catch(() => ({}))) as CheckoutResponse;

  if (!res.ok || !body.data?.attributes?.url) {
    const detail = body.errors?.[0]?.detail ?? `HTTP ${res.status}`;
    throw new Error(`Lemon Squeezy a refuzat checkout-ul: ${detail}`);
  }

  return { url: body.data.attributes.url, checkoutId: String(body.data.id ?? '') };
}
