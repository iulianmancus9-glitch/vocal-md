/**
 * Worker-ul. Rulează într-un container separat de web, cu aceeași imagine.
 *
 *   npm run worker
 *
 * Web-ul nu face niciodată apeluri lungi către Gemini sau Suno: pune un job în coadă
 * și răspunde imediat. Aici se așteaptă cele două-trei minute de generare, fără să
 * țină o cerere HTTP deschisă.
 */
import { hostname } from 'node:os';
import { pool } from '@/lib/db';
import type { Job } from '@/lib/db/schema';
import { claimNext, completeJob, enqueue, failJob, requeueStaleJobs } from '@/lib/queue/queue';
import { handleCleanup } from '@/lib/queue/handlers/cleanup';
import { handleLyrics } from '@/lib/queue/handlers/lyrics';
import { handleRender } from '@/lib/queue/handlers/render';

const WORKER_ID = `${hostname()}-${process.pid}`;
const IDLE_MS = 2000;
const CLEANUP_EVERY_MS = 6 * 60 * 60 * 1000;

/**
 * `deliver` (emailul cu melodia completă) intră aici odată cu integrarea Paddle.
 * Până atunci nimic nu îl pune în coadă, iar un job neașteptat trebuie să se vadă,
 * nu să fie înghițit în tăcere.
 */
const handlers: Partial<Record<Job['type'], (job: Job) => Promise<void>>> = {
  lyrics: handleLyrics,
  render: handleRender,
  cleanup: handleCleanup,
};

let running = true;
let current: string | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runOne(job: Job): Promise<void> {
  const handler = handlers[job.type];
  const started = Date.now();
  console.log(`▸ ${job.type} ${job.orderId ?? ''} (încercarea ${job.attempts})`);

  if (!handler) {
    await failJob(job, new Error(`Nu există handler pentru jobul "${job.type}".`), {
      permanent: true,
    });
    return;
  }

  try {
    await handler(job);
    await completeJob(job.id);
    console.log(`✓ ${job.type} în ${Math.round((Date.now() - started) / 1000)}s`);
  } catch (err) {
    const permanent = Boolean((err as { permanent?: boolean }).permanent);
    const retry = await failJob(job, err, { permanent });
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${job.type}: ${msg}${retry ? ' — reîncerc' : ' — abandonat'}`);
  }
}

async function loop(): Promise<void> {
  console.log(`Worker ${WORKER_ID} pornit.`);

  const requeued = await requeueStaleJobs();
  if (requeued) console.log(`Am repus în coadă ${requeued} joburi rămase blocate.`);

  let lastCleanup = 0;

  while (running) {
    if (Date.now() - lastCleanup > CLEANUP_EVERY_MS) {
      lastCleanup = Date.now();
      await enqueue('cleanup', null, { maxAttempts: 1 });
    }

    let job: Job | null = null;
    try {
      job = await claimNext(WORKER_ID);
    } catch (err) {
      console.error('Nu pot citi coada:', err);
      await sleep(5000);
      continue;
    }

    if (!job) {
      await sleep(IDLE_MS);
      continue;
    }

    current = job.id;
    await runOne(job);
    current = null;
  }
}

/** La `docker compose down` terminăm jobul curent înainte să închidem. */
async function shutdown(signal: string): Promise<void> {
  if (!running) return;
  running = false;
  console.log(`\n${signal} primit. ${current ? 'Termin jobul curent...' : 'Închid.'}`);

  const deadline = Date.now() + 30_000;
  while (current && Date.now() < deadline) await sleep(500);

  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

loop().catch(async (err) => {
  console.error('Worker-ul s-a oprit din cauza unei erori:', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
