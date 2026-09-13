/**
 * Ce vede browserul despre o comandă.
 *
 * Tot ce nu-i trebuie clientului rămâne pe server: secretul de acces, id-ul de
 * task Suno, adresele de la care descărcăm, mesajele tehnice de eroare.
 */
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orderTracks, type Order } from '@/lib/db/schema';
import { downloadUrl } from '@/lib/storage';

export interface TrackState {
  variant: number;
  duration: number | null;
  previewUrl: string | null;
  /** Completat doar după plată. */
  fullUrl: string | null;
}

export interface OrderState {
  publicId: string;
  status: Order['status'];
  paid: boolean;
  songTitle: string | null;
  lyrics: string | null;
  regensLeft: number;
  /** Mesajul pentru om, când comanda s-a oprit. */
  problem: string | null;
  tracks: TrackState[];
  createdAt: string;
}

const PAID_STATUSES: Order['status'][] = ['paid', 'delivered'];

/** Explicația pe care o citește clientul când ceva s-a oprit. */
function problemFor(order: Order): string | null {
  if (order.status === 'refused') {
    return order.failureMessage
      ? `Nu putem face această melodie: ${order.failureMessage}`
      : 'Nu putem face această melodie din cauza regulilor de conținut.';
  }
  if (order.status === 'failed') {
    return 'Generarea nu a reușit. Nu ai fost taxat. Încearcă din nou sau scrie-ne.';
  }
  return null;
}

export async function orderState(order: Order): Promise<OrderState> {
  const paid = PAID_STATUSES.includes(order.status);

  const tracks = await db
    .select()
    .from(orderTracks)
    .where(eq(orderTracks.orderId, order.id))
    .orderBy(asc(orderTracks.variant));

  return {
    publicId: order.publicId,
    status: order.status,
    paid,
    songTitle: order.songTitle,
    lyrics: order.lyrics,
    regensLeft: order.regensLeft,
    problem: problemFor(order),
    createdAt: order.createdAt.toISOString(),
    tracks: tracks.map((t) => ({
      variant: t.variant,
      duration: t.durationSeconds,
      previewUrl: t.previewPath ? downloadUrl(order.publicId, t.variant, 'preview') : null,
      fullUrl: paid && t.fullPath ? downloadUrl(order.publicId, t.variant, 'full') : null,
    })),
  };
}
