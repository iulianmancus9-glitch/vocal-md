/**
 * Proba mărcii sonore.
 *
 *   npm run marca
 *
 * Face o melodie falsă de două minute și jumătate, pune marca peste ea exact
 * cum o pune worker-ul, și spune ce a ieșit. Nu atinge baza de date și nu
 * consumă credite.
 *
 * E aici pentru că filtrul ffmpeg e singura bucată din lanț care nu se poate
 * verifica citind codul: ori merge, ori dă o eroare lungă și de neînțeles. Cu
 * proba asta se află în cinci secunde, nu după un deploy.
 *
 * Fișierul rezultat rămâne pe disc, ca să-l poți asculta.
 */
import { execFile } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { getDuration, makeDemo } from '../src/lib/pipeline/audio';

const run = promisify(execFile);

const SECONDS = Number(process.argv[2] ?? 150);
const MARK = resolve(process.cwd(), process.env.WATERMARK_FILE ?? 'marca/marca.mp4');
const FROM = Number(process.env.WATERMARK_FROM_SECONDS ?? 30);
const EVERY = Number(process.env.WATERMARK_EVERY_SECONDS ?? 30);
const VOLUME = Number(process.env.WATERMARK_VOLUME ?? 1);

async function main() {
  if (!existsSync(MARK)) {
    console.error(`\nNu găsesc marca la:\n  ${MARK}\n`);
    console.error('Pune fișierul acolo. Cum anume, scrie în marca/CITESTE.md.\n');
    process.exit(1);
  }

  const markSeconds = await getDuration(MARK).catch(() => 0);
  console.log(`\nMarca:  ${MARK}`);
  console.log(`        ${markSeconds ? markSeconds.toFixed(1) + ' secunde' : 'durată necitibilă'}` +
              `, ${(statSync(MARK).size / 1024).toFixed(0)} KB`);

  const dir = await mkdtemp(join(tmpdir(), 'marca-'));
  const song = join(dir, 'melodie.mp3');
  const out = join(dir, 'demo.mp3');

  console.log(`\nFac o melodie falsă de ${SECONDS} secunde...`);
  await run('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', `sine=frequency=330:duration=${SECONDS}`,
    '-b:a', '192k', song,
  ]);

  const marks: number[] = [];
  for (let at = FROM; at > 0 && at < SECONDS - 2; at += EVERY) marks.push(at);
  console.log(`Pun marca la secundele: ${marks.join(', ') || '(niciuna)'}`);

  await makeDemo(song, MARK, out, {
    startAt: FROM, every: EVERY, volume: VOLUME, duration: SECONDS,
  });

  const got = await getDuration(out);
  const kb = (statSync(out).size / 1024).toFixed(0);

  console.log(`\n✓ A ieșit: ${got.toFixed(1)} secunde, ${kb} KB`);
  if (Math.abs(got - SECONDS) > 2) {
    console.log(`  ATENȚIE: ar fi trebuit ${SECONDS} secunde. Ceva a tăiat melodia.`);
  } else {
    console.log('  Durata e cea a melodiei întregi, deci marca nu a scurtat-o.');
  }
  console.log(`\nAscultă fișierul:\n  ${out}\n`);
  console.log('Dacă marca se aude prea tare sau prea încet, schimbă');
  console.log('WATERMARK_VOLUME în .env și rulează iar. 1 = cât e în fișierul tău.\n');
}

main().catch((err) => {
  console.error('\nProba a picat:\n');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
