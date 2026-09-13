/**
 * Coada de joburi, în Postgres.
 *
 * `FOR UPDATE SKIP LOCKED` face ca doi worker-i porniți în paralel să nu ia niciodată
 * același job, fără broker separat. La volumul acestui site e suficient și înseamnă
 * un serviciu mai puțin de supravegheat pe VPS.
 */
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { jobs, type Job, type JobType } from '@/lib/db/schema';

/** Pauza dinaintea fiecărei reîncercări. Ultima valoare se repetă dacă mai sunt încercări. */
const BACKOFF_SECONDS = [30, 120, 600];

export interface EnqueueOptions {
  payload?: Record<string, unknown>;
  runAfter?: Date;
  maxAttempts?: number;
}

/**
 * Pune un job în coadă. Dacă aceeași comandă are deja un job de același tip în lucru,
 * nu se întâmplă nimic — indexul parțial `jobs_active_key` oprește dublura, deci un
 * dublu-click nu poate consuma de două ori credite Suno.
 *
 * @returns jobul creat, sau null dacă exista deja unul activ.
 */
export async function enqueue(
  type: JobType,
  orderId: string | null,
  opts: EnqueueOptions = {},
): Promise<Job | null> {
  const rows = await db
    .insert(jobs)
    .values({
      type,
      orderId,
      payload: opts.payload ?? {},
      runAfter: opts.runAfter ?? new Date(),
      maxAttempts: opts.maxAttempts ?? 3,
    })
    .onConflictDoNothing({
      target: [jobs.orderId, jobs.type],
      where: sql`status in ('queued', 'running')`,
    })
    .returning();

  return rows[0] ?? null;
}

/**
 * Ia următorul job disponibil și îl marchează `running`, într-o singură instrucțiune.
 * Întoarce null dacă nu e nimic de făcut.
 *
 * Actualizarea trece prin query builder, nu prin SQL brut, tocmai ca rândul întors să
 * vină cu numele din schemă (`orderId`, `maxAttempts`). Cu `db.execute` ar veni cu
 * numele coloanelor din bază și worker-ul ar primi câmpuri nedefinite.
 */
export async function claimNext(workerId: string): Promise<Job | null> {
  const rows = await db
    .update(jobs)
    .set({
      status: 'running',
      attempts: sql`${jobs.attempts} + 1`,
      lockedAt: new Date(),
      lockedBy: workerId,
      startedAt: sql`coalesce(${jobs.startedAt}, now())`,
      updatedAt: new Date(),
    })
    .where(
      eq(
        jobs.id,
        // SKIP LOCKED: doi worker-i porniți în paralel nu iau niciodată același job.
        sql`(
          select j.id from ${jobs} j
           where j.status = 'queued'
             and j.run_after <= now()
           order by j.run_after
           for update skip locked
           limit 1
        )`,
      ),
    )
    .returning();

  return rows[0] ?? null;
}

export async function completeJob(jobId: string): Promise<void> {
  await db
    .update(jobs)
    .set({
      status: 'done',
      finishedAt: new Date(),
      updatedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    })
    .where(eq(jobs.id, jobId));
}

/**
 * Marchează eșecul. Dacă mai sunt încercări și eroarea nu e definitivă, jobul se
 * întoarce în coadă cu o pauză; altfel rămâne `failed` și trebuie privit de om.
 *
 * @returns true dacă jobul va fi reîncercat.
 */
export async function failJob(
  job: Job,
  error: unknown,
  { permanent = false }: { permanent?: boolean } = {},
): Promise<boolean> {
  const message = error instanceof Error ? error.message : String(error);
  const willRetry = !permanent && job.attempts < job.maxAttempts;

  if (willRetry) {
    const wait = BACKOFF_SECONDS[Math.min(job.attempts - 1, BACKOFF_SECONDS.length - 1)]!;
    await db
      .update(jobs)
      .set({
        status: 'queued',
        runAfter: new Date(Date.now() + wait * 1000),
        lastError: message.slice(0, 2000),
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id));
  } else {
    await db
      .update(jobs)
      .set({
        status: 'failed',
        finishedAt: new Date(),
        lastError: message.slice(0, 2000),
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id));
  }

  return willRetry;
}

/**
 * Joburile rămase `running` după o repornire bruscă a worker-ului. Fără asta ar sta
 * blocate la nesfârșit, iar indexul de unicitate ar refuza joburi noi pentru aceeași comandă.
 */
export async function requeueStaleJobs(olderThanMinutes = 20): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  const rows = await db
    .update(jobs)
    .set({ status: 'queued', lockedAt: null, lockedBy: null, updatedAt: new Date() })
    .where(and(eq(jobs.status, 'running'), lt(jobs.lockedAt, cutoff), isNull(jobs.finishedAt)))
    .returning({ id: jobs.id });
  return rows.length;
}
