/**
 * Pagina unei comenzi, deschisă dintr-un link de email.
 *
 * Linkul poartă secretul comenzii, pentru că emailul poate fi citit pe alt
 * telefon decât cel de pe care s-a comandat. Dacă secretul e bun, îl mutăm
 * într-un cookie și de acolo încolo pagina se poartă exact ca acasă.
 */
import { notFound } from 'next/navigation';
import Vocal from '@/components/Vocal';
import { loadOrder, remember } from '@/lib/session';
import { pageLang } from '@/lib/lang';

export const dynamic = 'force-dynamic';

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { publicId } = await params;
  const { t } = await searchParams;

  const order = await loadOrder(publicId, t ?? null);
  if (!order) notFound();

  // Browserul ține minte comanda, ca linkul să nu mai fie nevoie a doua oară.
  if (t) await remember(publicId, order.accessToken);

  return <Vocal initialOrderId={publicId} lang={await pageLang()} />;
}
