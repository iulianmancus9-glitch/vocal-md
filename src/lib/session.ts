/**
 * Cine are dreptul să vadă o comandă.
 *
 * Nu există conturi și nici parole. Fiecare comandă are un secret generat la
 * creare, ținut într-un cookie httpOnly, deci inaccesibil din JavaScript și
 * netrimis către alte domenii. Linkurile din email vor purta același secret.
 */
import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { orders, type Order } from '@/lib/db/schema';

const COOKIE = 'vocal_orders';
/** Câte comenzi ținem minte per browser. Peste asta, cea mai veche iese. */
const MAX_REMEMBERED = 12;

interface Entry {
  id: string;
  t: string;
}

async function read(): Promise<Entry[]> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Entry[]).filter((e) => e?.id && e?.t) : [];
  } catch {
    return [];
  }
}

/** Adaugă comanda proaspăt creată la cele pe care browserul le ține minte. */
export async function remember(publicId: string, token: string): Promise<void> {
  const list = [{ id: publicId, t: token }, ...(await read()).filter((e) => e.id !== publicId)];
  (await cookies()).set(COOKIE, JSON.stringify(list.slice(0, MAX_REMEMBERED)), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
  });
}

/** Publicele pe care le știe browserul, cele mai noi întâi. */
export async function rememberedIds(): Promise<string[]> {
  return (await read()).map((e) => e.id);
}

function sameToken(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Comanda cerută, dacă browserul chiar are secretul ei.
 *
 * `tokenFromUrl` acoperă linkurile din email, deschise pe alt dispozitiv decât
 * cel pe care s-a plasat comanda.
 */
export async function loadOrder(
  publicId: string,
  tokenFromUrl?: string | null,
): Promise<Order | null> {
  const order = await db.query.orders.findFirst({ where: eq(orders.publicId, publicId) });
  if (!order) return null;

  if (tokenFromUrl && sameToken(order.accessToken, tokenFromUrl)) return order;

  const entry = (await read()).find((e) => e.id === publicId);
  if (entry && sameToken(order.accessToken, entry.t)) return order;

  return null;
}
