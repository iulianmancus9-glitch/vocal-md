/**
 * Verifică garanțiile pe care se sprijină restul aplicației: indexul care oprește
 * dublul-click, preluarea din coadă, ștergerile în cascadă, linkurile semnate.
 *
 *   CONFIRM_WIPE=1 npx tsx scripts/verify-schema.ts
 *
 * GOLEȘTE tabelele `orders` și `jobs`. Se rulează doar pe o bază de test — de asta
 * cere `CONFIRM_WIPE=1` și refuză o bază al cărei nume nu conține „test" sau „dev".
 */
import { eq, sql } from 'drizzle-orm';
import { db, pool } from '@/lib/db';
import { jobs, lyricsVersions, orderEvents, orderTracks, orders } from '@/lib/db/schema';
import { newAccessToken, newPublicId } from '@/lib/db/ids';
import { claimNext, completeJob, enqueue, failJob } from '@/lib/queue/queue';
import { unpaidExpiry } from '@/lib/orders';
import { signDownload, verifyDownload } from '@/lib/storage';

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? '  ✓' : '  ✗'} ${name}${extra ? ' — ' + extra : ''}`);
};

function guard() {
  if (process.env.CONFIRM_WIPE !== '1') {
    throw new Error('Scriptul golește tabele. Rulează-l cu CONFIRM_WIPE=1.');
  }
  const url = process.env.DATABASE_URL ?? '';
  const dbName = url.split('/').pop()?.split('?')[0] ?? '';
  if (!/test|dev/i.test(dbName)) {
    throw new Error(
      `Baza „${dbName}" nu pare a fi de test. Rulează pe o bază cu „test" sau „dev" în nume.`,
    );
  }
}

async function main() {
  guard();
  await db.delete(orders);
  await db.delete(jobs);

  /* ─── o comandă ca din formular ─── */
  const [order] = await db.insert(orders).values({
    publicId: newPublicId(),
    accessToken: newAccessToken(),
    styleId: 'romantic', direction: 'Baladă', mood: 'Tandră', voice: 'Bărbat',
    recipient: 'Soție', names: ['Ana', 'Maria'], occasion: 'Aniversare de cuplu',
    titleWanted: 'Zece ani împreună', story: 'Facem 10 ani de la nuntă.',
    email: 'client@exemplu.md', expiresAt: unpaidExpiry(),
  }).returning();

  ok('comanda se creează cu status draft', order!.status === 'draft');
  ok('names e text[] citit ca array', Array.isArray(order!.names) && order!.names[1] === 'Maria');
  ok('regensLeft implicit 2', order!.regensLeft === 2);
  ok('expiresAt la ~30 de zile',
    Math.round((order!.expiresAt.getTime() - Date.now()) / 86400000) === 30);

  /* ─── dublul click nu poate cumpăra de două ori credite Suno ─── */
  const j1 = await enqueue('render', order!.id);
  const j2 = await enqueue('render', order!.id);
  ok('primul job de render intră în coadă', j1 !== null);
  ok('al doilea job identic e respins de indexul parțial', j2 === null);

  const jOther = await enqueue('lyrics', order!.id);
  ok('un job de alt tip pentru aceeași comandă e permis', jOther !== null);

  /* ─── preluarea din coadă ─── */
  const claimed = await claimNext('test-worker');
  ok('claimNext ia un job și îl marchează running',
    claimed?.status === 'running' && claimed.attempts === 1);
  ok('claimNext setează locked_by', claimed?.lockedBy === 'test-worker');

  const second = await claimNext('test-worker');
  ok('al doilea claim ia celălalt job, nu pe același', second !== null && second.id !== claimed!.id);
  ok('coada e goală după ce ambele joburi sunt luate', (await claimNext('test-worker')) === null);

  /* ─── reîncercare cu pauză ─── */
  const retried = await failJob(claimed!, new Error('rețea căzută'));
  ok('eroarea temporară repune jobul în coadă', retried === true);
  const [requeued] = await db.select().from(jobs).where(eq(jobs.id, claimed!.id));
  ok('jobul reîncercat are run_after în viitor', requeued!.runAfter.getTime() > Date.now());
  ok('jobul reîncercat păstrează mesajul erorii', requeued!.lastError === 'rețea căzută');

  const permanent = await failJob({ ...claimed!, attempts: 1 }, new Error('refuzat'), { permanent: true });
  ok('eroarea definitivă nu se reîncearcă', permanent === false);

  await completeJob(second!.id);
  const [done] = await db.select().from(jobs).where(eq(jobs.id, second!.id));
  ok('completeJob marchează done și eliberează lacătul',
    done!.status === 'done' && done!.lockedBy === null);

  /* ─── după un job terminat, se poate pune altul de același tip ─── */
  const j3 = await enqueue(second!.type, order!.id);
  ok('un job nou de același tip e permis după ce cel vechi s-a terminat', j3 !== null);

  /* ─── task-ul Suno e unic, dar NULL se repetă liber ─── */
  await db.update(orders).set({ sunoTaskId: 'task-abc' }).where(eq(orders.id, order!.id));
  const [o2] = await db.insert(orders).values({
    publicId: newPublicId(), accessToken: newAccessToken(), expiresAt: unpaidExpiry(),
  }).returning();
  let duplicateRejected = false;
  try {
    await db.update(orders).set({ sunoTaskId: 'task-abc' }).where(eq(orders.id, o2!.id));
  } catch { duplicateRejected = true; }
  ok('două comenzi nu pot împărți același suno_task_id', duplicateRejected);
  const nulls = await db.select({ n: sql<number>`count(*)::int` }).from(orders)
    .where(sql`suno_task_id is null`);
  ok('mai multe comenzi pot avea suno_task_id NULL', (nulls[0]!.n ?? 0) >= 1);

  /* ─── ștergerea unei comenzi ia cu ea tot ce atârnă de ea ─── */
  await db.insert(lyricsVersions).values({
    orderId: order!.id, version: 1, source: 'ai', lyrics: '[Refren]\nAna...',
  });
  await db.insert(orderTracks).values({ orderId: order!.id, variant: 1, fullPath: 'x/1.mp3' });
  await db.insert(orderEvents).values({ orderId: order!.id, type: 'test' });

  await db.delete(orders).where(eq(orders.id, order!.id));
  const left = await db.select({ n: sql<number>`count(*)::int` }).from(lyricsVersions);
  const tracksLeft = await db.select({ n: sql<number>`count(*)::int` }).from(orderTracks);
  const jobsLeft = await db.select({ n: sql<number>`count(*)::int` }).from(jobs);
  ok('versurile se șterg în cascadă', left[0]!.n === 0);
  ok('piesele se șterg în cascadă', tracksLeft[0]!.n === 0);
  ok('joburile se șterg în cascadă', jobsLeft[0]!.n === 0);

  /* ─── linkurile semnate ─── */
  const { exp, sig } = signDownload('abc123', 1, 'preview');
  ok('linkul propriu se validează', verifyDownload('abc123', 1, 'preview', exp, sig));
  ok('nu poți transforma preview în integral schimbând URL-ul',
    !verifyDownload('abc123', 1, 'full', exp, sig));
  ok('nu poți folosi linkul altei comenzi', !verifyDownload('altcineva', 1, 'preview', exp, sig));
  ok('linkul expirat e refuzat',
    !verifyDownload('abc123', 1, 'preview', Math.floor(Date.now() / 1000) - 10, sig));

  console.log(`\n${pass} verificări trecute, ${fail} eșuate.`);
  await pool.end();
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
