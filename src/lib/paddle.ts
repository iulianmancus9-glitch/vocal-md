/**
 * Legătura cu Paddle.
 *
 * Tranzacția se creează pe server, nu în browser: prețul, cantitatea și
 * identificatorul comenzii sunt puse de noi. Dacă browserul ar alege prețul,
 * oricine l-ar putea schimba înainte să apese „plătește".
 *
 * Paddle e comerciant înregistrat, deci el se ocupă de TVA și de facturi. Noi
 * răspundem la o singură întrebare: are dreptul comanda asta la fișierele
 * integrale?
 */
import { Environment, Paddle } from '@paddle/paddle-node-sdk';
import { env } from '@/lib/env';
import type { Order } from '@/lib/db/schema';

let client: Paddle | undefined;

export function paddle(): Paddle {
  if (!env.PADDLE_API_KEY) {
    throw new Error('Lipsește PADDLE_API_KEY din .env — plata nu poate fi pornită.');
  }
  client ??= new Paddle(env.PADDLE_API_KEY, {
    environment: env.PADDLE_ENV === 'production' ? Environment.production : Environment.sandbox,
  });
  return client;
}

/** Plata e configurată complet? Dacă nu, butonul spune că se activează în curând. */
export function paymentsEnabled(): boolean {
  return Boolean(env.PADDLE_API_KEY && env.PADDLE_CLIENT_TOKEN && env.PADDLE_PRICE_ID);
}

/**
 * Clientul Paddle pentru adresa de email dată.
 *
 * Îl căutăm întâi: la a doua comandă de pe aceeași adresă, Paddle refuză să
 * creeze un client duplicat, iar noi vrem oricum să vadă istoricul la un loc.
 */
async function customerFor(email: string): Promise<string | undefined> {
  const api = paddle();
  try {
    const existing = api.customers.list({ email: [email], perPage: 1 });
    for await (const customer of existing) return customer.id;

    const created = await api.customers.create({ email });
    return created.id;
  } catch (err) {
    // Fără client, Paddle cere emailul la checkout. Mai bine așa decât deloc.
    console.error('Nu am putut pregăti clientul Paddle:', err);
    return undefined;
  }
}

export interface CheckoutSession {
  transactionId: string;
  clientToken: string;
  environment: 'sandbox' | 'production';
}

export async function createCheckout(order: Order): Promise<CheckoutSession> {
  const api = paddle();

  const customerId = order.email ? await customerFor(order.email) : undefined;

  const transaction = await api.transactions.create({
    items: [{ priceId: env.PADDLE_PRICE_ID, quantity: 1 }],
    ...(customerId ? { customerId } : {}),
    // Prin asta găsim comanda când vine webhook-ul. E singura legătură dintre
    // plata lui Paddle și rândul nostru din bază.
    customData: { orderId: order.publicId },
  });

  return {
    transactionId: transaction.id,
    clientToken: env.PADDLE_CLIENT_TOKEN,
    environment: env.PADDLE_ENV,
  };
}
