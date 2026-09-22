/**
 * Ce vede browserul despre o comandă.
 *
 * Tot ce nu-i trebuie clientului rămâne pe server: secretul de acces, id-urile
 * de task Suno, adresele de la care descărcăm, mesajele tehnice de eroare.
 */
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { lyricsVersions, orderTracks, renders, type Order } from '@/lib/db/schema';
import { downloadUrl } from '@/lib/storage';

export interface TrackState {
  variant: number;
  duration: number | null;
  previewUrl: string | null;
  /** Completat doar după plată. */
  fullUrl: string | null;
}

export interface RecordingState {
  id: string;
  generation: number;
  lyricsVersion: number;
  status: 'pending' | 'running' | 'done' | 'failed';
  createdAt: string;
  tracks: TrackState[];
}

export interface LyricsVersionState {
  version: number;
  title: string | null;
  lyrics: string;
  source: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface OrderState {
  publicId: string;
  status: Order['status'];
  paid: boolean;
  /**
   * Adresa lui, întoarsă înapoi lui.
   *
   * Linkul de plată MAIB e același pentru toți și nu poartă numărul comenzii.
   * Singura punte între banii intrați și rândul din baza noastră e emailul, deci
   * ecranul de plată i-l arată și îl roagă să-l folosească și acolo. Nu e o
   * scurgere: ca să ajungi aici, ai deja cheia comenzii.
   */
  email: string | null;
  /** Numele din piesă. Pagina de start le folosește ca să-l întrebe pe om
   *  dacă vrea să continue „melodia pentru Ana". */
  names: string[];
  /** Ultima atingere a comenzii. După ea se decide dacă a fost un refresh
   *  (și îl ducem direct înapoi) sau o revenire (și îl întrebăm). */
  updatedAt: string;
  songTitle: string | null;
  lyrics: string | null;
  lyricsVersion: number;
  regensLeft: number;
  rendersLeft: number;
  /** Mesajul pentru om, când comanda s-a oprit. */
  problem: string | null;
  createdAt: string;
  currentRenderId: string | null;
  /** Toate înregistrările reușite, cea mai nouă la final. */
  recordings: RecordingState[];
  /** Piesele înregistrării alese — ce ascultă clientul acum. */
  tracks: TrackState[];
  /** Variantele de versuri, ca să se poată întoarce la una mai veche. */
  lyricsHistory: LyricsVersionState[];
}

/**
 * Plata se citește din `paid_at`, nu din stare.
 *
 * O comandă plătită trece iar prin „rendering" dacă omul cere încă o
 * înregistrare — iar dacă am citi starea, tocmai clientul care a plătit și-ar
 * pierde fișierele cât se face varianta nouă. `paid_at` se scrie la confirmare
 * și se șterge la rambursare, deci spune adevărul în orice moment.
 */
function isPaid(order: Order): boolean {
  return order.paidAt !== null;
}

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
  const paid = isPaid(order);

  const [recordingRows, trackRows, versionRows] = await Promise.all([
    db.select().from(renders).where(eq(renders.orderId, order.id)).orderBy(asc(renders.generation)),
    db.select().from(orderTracks).where(eq(orderTracks.orderId, order.id))
      .orderBy(asc(orderTracks.variant)),
    db.select().from(lyricsVersions).where(eq(lyricsVersions.orderId, order.id))
      .orderBy(asc(lyricsVersions.version)),
  ]);

  const toTrack = (t: typeof trackRows[number], generation: number): TrackState => ({
    variant: t.variant,
    duration: t.durationSeconds,
    previewUrl: t.previewPath ? downloadUrl(order.publicId, generation, t.variant, 'preview') : null,
    // După plată, toate înregistrările se pot descărca — sunt deja generate,
    // iar un client care a plătit n-are de ce să rămână blocat pe una singură.
    fullUrl: paid && t.fullPath ? downloadUrl(order.publicId, generation, t.variant, 'full') : null,
  });

  const recordings: RecordingState[] = recordingRows
    .filter((r) => r.status === 'done')
    .map((r) => ({
      id: r.id,
      generation: r.generation,
      lyricsVersion: r.lyricsVersion,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      tracks: trackRows.filter((t) => t.renderId === r.id).map((t) => toTrack(t, r.generation)),
    }));

  const chosen =
    recordings.find((r) => r.id === order.currentRenderId) ?? recordings[recordings.length - 1];

  return {
    publicId: order.publicId,
    status: order.status,
    paid,
    email: order.email,
    names: order.names ?? [],
    updatedAt: order.updatedAt.toISOString(),
    songTitle: order.songTitle,
    lyrics: order.lyrics,
    lyricsVersion: order.lyricsVersion,
    regensLeft: order.regensLeft,
    rendersLeft: order.rendersLeft,
    problem: problemFor(order),
    createdAt: order.createdAt.toISOString(),
    currentRenderId: chosen?.id ?? null,
    recordings,
    tracks: chosen?.tracks ?? [],
    lyricsHistory: versionRows.map((v) => ({
      version: v.version,
      title: v.title,
      lyrics: v.lyrics,
      source: v.source,
      createdAt: v.createdAt.toISOString(),
      isCurrent: v.version === order.lyricsVersion,
    })),
  };
}
