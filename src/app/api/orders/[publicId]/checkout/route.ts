/**
 * POST /api/orders/:publicId/checkout — pregătește plata.
 *
 * Nu încasează nimic și nu confirmă nimic: întoarce adresa de plată, ca
 * browserul s-o deschidă. Banii se confirmă abia când cineva apasă butonul de
 * pe Telegram, după ce i-a văzut în cont.
 *
 * Trimitem o notificare încă de aici, nu doar la „am plătit": dacă omul deschide
 * linkul la unsprezece noaptea, e bine să știm că urmează o plată, chiar dacă
 * n-o anunță niciodată. Notificarea nu poate opri ruta — dacă Telegram e căzut,
 * clientul tot trebuie să poată plăti.
 */
import { fail, guard, ok } from '@/lib/api';
import { logEvent } from '@/lib/orders';
import { createCheckout, paymentsEnabled } from '@/lib/plata';
import { loadOrder } from '@/lib/session';
import { esc, notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  return guard(async () => {
    const { publicId } = await params;
    const order = await loadOrder(publicId);
    if (!order) return fail('Comanda nu a fost găsită.', 404);

    if (!paymentsEnabled()) {
      return fail('Plata se activează în curând. Scrie-ne și îți trimitem melodia.', 503);
    }
    if (order.status === 'paid' || order.status === 'delivered') {
      return fail('Comanda e deja plătită.', 409);
    }
    // `payment_claimed` trece: omul poate deschide linkul a doua oară dacă
    // prima încercare i-a picat la bancă.
    if (order.status !== 'preview_ready' && order.status !== 'payment_claimed') {
      return fail('Melodia nu e gata încă.', 409);
    }

    const session = createCheckout(order.publicId);
    await logEvent(order.id, 'checkout_opened', { provider: 'maib' });

    /**
     * Mesajul are butoanele încă de acum, nu doar când clientul apasă „am
     * plătit".
     *
     * Sunt oameni care plătesc și închid pagina, fără să mai confirme nimic.
     * Dacă banii au intrat, melodia lui n-are de ce să aștepte un buton pe care
     * el nu știe că trebuie să-l apese: deblochezi de aici și gata.
     */
    await notify(
      `💳 <b>A deschis linkul de plată</b>\n\n` +
      `Comanda <code>${esc(order.publicId)}</code>\n` +
      `Email: <code>${esc(order.email)}</code>\n` +
      `Titlu: ${esc(order.songTitle ?? order.titleWanted ?? '—')}\n\n` +
      `<b>Dacă vezi 30 € în MAIB de la emailul de mai sus, deblochează de aici.</b>\n` +
      `<i>Nu aștepta să confirme el — sunt clienți care nu apasă nimic.</i>`,
      [
        { text: '✅ Deblochează', data: `ok:${order.publicId}` },
        { text: '❌ N-au intrat banii', data: `no:${order.publicId}` },
      ],
    );

    return ok(session);
  });
}
