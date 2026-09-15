/**
 * Pagina unei comenzi, deschisă dintr-un link de email.
 *
 * Linkul poartă secretul comenzii, pentru că emailul poate fi citit pe alt
 * telefon decât cel de pe care s-a comandat. Dacă secretul e bun, îl mutăm
 * într-un cookie și de acolo încolo pagina se poartă exact ca acasă.
 */
import { notFound } from 'next/navigation';
import Vocal from '@/components/Vocal';
import { loadOrder } from '@/lib/session';
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

  // Ținerea de minte se face în ruta API, la prima întrebare a paginii: aici,
  // într-o randare de server, scrierea unui cookie arunca și ieșea 500.
  return <Vocal initialOrderId={publicId} initialToken={t ?? null} lang={await pageLang()} />;
}
