/**
 * Tăierea previzualizării cu ffmpeg.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** Durata unui fișier audio, în secunde. */
export async function getDuration(file: string): Promise<number> {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  return parseFloat(stdout.trim());
}

/**
 * Face previzualizarea de 60 de secunde.
 *
 * Două decizii importante:
 *  - fade-out pe ultimele 3 secunde, ca să nu pară tăiată din greșeală
 *  - bitrate 128k față de originalul integral, ca diferența de calitate
 *    să se audă pe o boxă și să mai dea un motiv de cumpărare
 */
export async function makePreview(
  input: string,
  output: string,
  { seconds = 60, bitrate = '128k' }: { seconds?: number; bitrate?: string } = {},
): Promise<string> {
  const fadeStart = Math.max(0, seconds - 3);
  await run('ffmpeg', [
    '-y',
    '-i', input,
    '-t', String(seconds),
    '-af', `afade=t=out:st=${fadeStart}:d=3`,
    '-b:a', bitrate,
    '-map_metadata', '-1',
    output,
  ]);
  return output;
}

/**
 * Opțional: marcă sonoră peste previzualizare.
 * Rămâne oprită implicit — vezi discuția despre conversie.
 * `tagFile` e un mp3 scurt cu numele brandului, rostit.
 */
export async function makePreviewWithTag(
  input: string,
  tagFile: string,
  output: string,
  { seconds = 60 }: { seconds?: number } = {},
): Promise<string> {
  const fadeStart = Math.max(0, seconds - 3);
  await run('ffmpeg', [
    '-y',
    '-i', input,
    '-i', tagFile,
    '-filter_complex',
    `[0:a]atrim=0:${seconds},afade=t=out:st=${fadeStart}:d=3[song];` +
    `[1:a]adelay=1800|1800,volume=0.55[t1];` +
    `[1:a]adelay=38000|38000,volume=0.35[t2];` +
    `[song][t1][t2]amix=inputs=3:duration=first:normalize=0[out]`,
    '-map', '[out]',
    '-b:a', '128k',
    output,
  ]);
  return output;
}
