/**
 * Pornirea unei înregistrări.
 *
 * O înregistrare = un task Suno = două interpretări. Clientul poate cere mai
 * multe, iar fiecare rămâne cu piesele ei, ca să se poată întoarce la ea.
 *
 * Rândul din `renders` se creează aici, înainte de a pune jobul în coadă, ca
 * worker-ul să știe de la bun început pe ce anume lucrează — altfel, la două
 * cereri apropiate, n-am ști care rezultat aparține cui.
 */
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, renders, type Order, type Render } from '@/lib/db/schema';
import { enqueue } from '@/lib/queue/queue';
import { briefFromOrder } from '@/lib/pipeline/brief';
import { buildStyle } from '@/lib/pipeline/prompt';
import { logEvent } from '@/lib/orders';
import { esc, notify } from '@/lib/telegram';
import { env } from '@/lib/env';

export interface StartRenderResult {
  render: Render | null;
  /** De ce nu s-a putut porni, în cuvinte pentru client. */
  reason?: string;
}

export async function startRender(
  order: Order,
  { styleHint }: { styleHint?: string } = {},
): Promise<StartRenderResult> {
  if (!order.lyrics?.trim()) {
    return { render: null, reason: 'Comanda nu are versuri.' };
  }

  const last = await db
    .select({ generation: renders.generation })
    .from(renders)
    .where(eq(renders.orderId, order.id))
    .orderBy(desc(renders.generation))
    .limit(1);

  const generation = (last[0]?.generation ?? 0) + 1;
  const style = buildStyle(briefFromOrder(order), styleHint);

  const [render] = await db
    .insert(renders)
    .values({
      orderId: order.id,
      generation,
      lyricsVersion: order.lyricsVersion || 1,
      styleString: style,
      sunoModel: env.SUNO_MODEL,
      status: 'pending',
    })
    .returning();

  // Indexul parțial de pe `jobs` oprește o a doua înregistrare pornită în
  // paralel pentru aceeași comandă — altfel un dublu-click ar consuma de două
  // ori credite Suno.
  const job = await enqueue('render', order.id, { payload: { renderId: render!.id } });
  if (!job) {
    await db.delete(renders).where(eq(renders.id, render!.id));
    return { render: null, reason: 'Se înregistrează deja o variantă. Așteaptă puțin.' };
  }

  await db
    .update(orders)
    .set({ status: 'rendering', failureCode: null, failureMessage: null, updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  await logEvent(order.id, 'render_started', { generation, style });

  /**
   * Anunțul pe Telegram. De aici încolo se cheltuiesc credite Suno și urmează,
   * poate, o plată — iar plata se deblochează cu mâna, deci e bine ca omul să
   * știe că vine, nu s-o afle când clientul așteaptă deja.
   *
   * Nu așteptăm răspunsul: clientul n-are de ce să stea după Telegram ca să i
   * se pornească melodia. Dacă pică, `notify` își înghite eroarea singur.
   */
  void notify(
    `🎬 <b>A intrat la înregistrare</b>\n` +
    `Comanda <code>${esc(order.publicId)}</code>` +
    (generation > 1 ? ` · înregistrarea ${generation}` : '') + `\n` +
    `Email: <code>${esc(order.email)}</code>\n` +
    `Titlu: ${esc(order.songTitle ?? order.titleWanted ?? '—')}\n` +
    `Stil: ${esc(style)}`,
  );

  return { render: render! };
}
