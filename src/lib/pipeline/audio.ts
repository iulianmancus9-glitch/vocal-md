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
 * Melodia întreagă, cu o semnătură sonoră suprapusă din loc în loc.
 *
 * Asta e varianta gratuită. Omul aude toată piesa, nu un minut din ea — ceea ce
 * convinge mult mai bine — dar n-o poate dărui așa: marca se aude peste ea.
 * Fișierele primite după plată sunt curate.
 *
 * Prima marcă vine după `startAt` secunde, apoi din `every` în `every`, cât ține
 * melodia. Începutul rămâne curat dinadins: primele secunde sunt cele care
 * conving, iar o bucată de treizeci de secunde nu e un cadou.
 *
 * ── De ce `asplit` ──
 *
 * Un flux nu poate fi folosit de două ori într-un `filter_complex`: ffmpeg
 * refuză. Marca trebuie copiată explicit în atâtea fluxuri câte suprapuneri
 * vrem, și abia apoi întârziat fiecare. Varianta scrisă înainte aici folosea
 * `[1:a]` de două ori și n-ar fi mers niciodată.
 *
 * `all=1` la `adelay` întârzie toate canalele, nu doar primul: fără el, o marcă
 * mono s-ar auzi într-o singură ureche.
 */
export async function makeDemo(
  input: string,
  tagFile: string,
  output: string,
  {
    startAt = 30,
    every = 30,
    volume = 0.5,
    bitrate = '128k',
    duration,
  }: {
    startAt?: number;
    every?: number;
    volume?: number;
    bitrate?: string;
    duration?: number;
  } = {},
): Promise<string> {
  const total = duration ?? (await getDuration(input).catch(() => 0));

  /* Momentele în care intră marca. Ultima trebuie să încapă întreagă, de asta
     ne oprim cu câteva secunde înainte de final. */
  const marks: number[] = [];
  for (let at = startAt; at > 0 && at < total - 2; at += Math.max(1, every)) {
    marks.push(at);
  }

  // Melodie prea scurtă pentru vreo marcă: o dăm așa cum e, dar tot recodată,
  // ca bitrate-ul mai mic să rămână o diferență față de fișierul plătit.
  if (marks.length === 0) {
    await run('ffmpeg', [
      '-y', '-i', input, '-b:a', bitrate, '-map_metadata', '-1', output,
    ]);
    return output;
  }

  const copies = marks.map((_, i) => `[c${i}]`).join('');
  const delays = marks
    .map((at, i) => `[c${i}]adelay=${Math.round(at * 1000)}:all=1[d${i}]`)
    .join(';');
  const mixed = marks.map((_, i) => `[d${i}]`).join('');

  await run('ffmpeg', [
    '-y',
    '-i', input,
    '-i', tagFile,
    '-filter_complex',
    `[1:a]aformat=sample_rates=44100:channel_layouts=stereo,` +
      `volume=${volume},asplit=${marks.length}${copies};` +
    `${delays};` +
    // `duration=first` ține rezultatul cât melodia, nu cât ultima marcă.
    // `normalize=0` păstrează volumul melodiei; `alimiter` prinde vârfurile
    // care ar putea trosni acolo unde marca se suprapune peste un refren tare.
    `[0:a]${mixed}amix=inputs=${marks.length + 1}:duration=first:normalize=0,` +
      `alimiter=limit=0.95[out]`,
    '-map', '[out]',
    '-b:a', bitrate,
    '-map_metadata', '-1',
    output,
  ]);
  return output;
}
