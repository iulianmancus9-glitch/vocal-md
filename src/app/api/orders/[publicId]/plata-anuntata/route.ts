/**
 * POST /api/orders/:publicId/plata-anuntata — clientul spune că a plătit.
 *
 * Asta **nu** e o plată. E un client care ne bate la ușă. Comanda trece în
 * `payment_claimed`, melodia rămâne închisă, iar pe Telegram pleacă un mesaj cu
 * două butoane: deblochează sau respinge. Nimic nu se deschide până nu apasă
 * cineva unul dintre ele.
 *
 * Proiectat așa dinadins: linkul MAIB e fix și nu ne anunță nimic, deci singura
 * dovadă că au intrat banii e contul. Un flux automat ar trebui să creadă
 * browserul pe cuvânt — iar browserul poate minți.
 *
 * A doua apăsare nu mai trimite nimic. Altfel un om nerăbdător ar umple
 * Telegramul cu același mesaj și butoanele s-ar amesteca între ele.
 */
import { fail, guard, ok } from '@/lib/api';
import { logEvent, setStatus } from '@/lib/orders';
import { orderState } from '@/lib/order-state';
import { paymentsEnabled } from '@/lib/plata';
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
    // Deja deblocată: nu e o eroare, doar n-avem ce face. Clientul primește
    // starea adevărată și pagina îl duce mai departe.
    if (order.status === 'paid' || order.status === 'delivered') {
      return ok(await orderState(order));
    }
    // Al doilea clic pe același buton: starea e deja bună, mesajul a plecat.
    if (order.status === 'payment_claimed') {
      return ok(await orderState(order));
    }
    if (order.status !== 'preview_ready') {
      return fail('Melodia nu e gata încă.', 409);
    }

    await setStatus(order.id, 'payment_claimed');
    await logEvent(order.id, 'payment_claimed', { provider: 'maib' });

    await notify(
      `🟡 <b>Spune că a plătit</b>\n\n` +
      `Comanda <code>${esc(order.publicId)}</code>\n` +
      `Email: <code>${esc(order.email)}</code>\n` +
      `Titlu: ${esc(order.songTitle ?? order.titleWanted ?? '—')}\n` +
      `Ora: ${new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Chisinau' })}\n\n` +
      `<b>Caută în MAIB 30 € de la emailul de mai sus.</b>\n` +
      `Dacă i-ai găsit, apasă „Deblochează". Dacă nu, „Respinge" — comanda se ` +
      `întoarce de unde a plecat și clientul poate încerca din nou.`,
      [
        { text: '✅ Deblochează', data: `ok:${order.publicId}` },
        { text: '❌ Respinge', data: `no:${order.publicId}` },
      ],
    );

    return ok(await orderState({ ...order, status: 'payment_claimed' }));
  });
}
