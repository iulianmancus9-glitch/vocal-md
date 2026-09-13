/**
 * Parcurgerea completă a site-ului, într-un browser adevărat.
 *
 *   BASE_URL=http://127.0.0.1:3000 \
 *   DATABASE_NAME=vocalmd_e2e \
 *   node scripts/e2e.mjs
 *
 * Ce verifică: formularul în șase pași, crearea comenzii pe server, trecerea
 * automată la versuri, aprobarea, ascultarea previzualizării, linkurile semnate
 * și deblocarea variantei integrale după plată.
 *
 * Ce nu verifică: Gemini și Suno. Worker-ul nu rulează aici; pașii lui sunt
 * imitați scriind direct în bază, ca testul să meargă fără chei și fără să
 * consume credite.
 *
 * GOLEȘTE tabelele. Rulează-l doar pe o bază de test.
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const DB = process.env.DATABASE_NAME ?? 'vocalmd_e2e';
const DB_USER = process.env.DATABASE_USER ?? 'vocal';
const DB_HOST = process.env.DATABASE_HOST ?? '127.0.0.1';
const DIR = process.env.STORAGE_DIR ?? './data/audio';

if (!/test|dev|e2e/i.test(DB)) {
  console.error(`Baza „${DB}" nu pare a fi de test. Testul golește tabele — oprit.`);
  process.exit(1);
}

const sql = (q) =>
  execFileSync('psql', ['-h', DB_HOST, '-U', DB_USER, '-d', DB, '-tAc', q], {
    env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD ?? 'vocal' },
  }).toString().trim();

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? '  ✓' : '  ✗'} ${name}${extra ? ' — ' + extra : ''}`);
};

sql('truncate orders cascade; truncate jobs; truncate rate_limits;');

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push(String(e)));

/* ─── formularul ─── */

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Doar necesare' }).click();
ok('bannerul de cookie-uri se închide la alegere', await page.locator('.ck').count() === 0);

await page.getByRole('button', { name: /Creează melodia ta/ }).click();
ok('pagina de start duce în formular', await page.locator('.vc-steps').count() === 1);
ok('bannerul nu se mai întoarce în formular', await page.locator('.vc-hero').count() === 0);

await page.getByRole('button', { name: /Romantic/ }).first().click();
await page.locator('.vc-nav .vc-next').click();
await page.getByRole('button', { name: 'Baladă', exact: true }).click();
await page.getByRole('button', { name: 'Tandră', exact: true }).click();
await page.getByRole('button', { name: /Bărbat/ }).click();
await page.locator('.vc-nav .vc-next').click();
await page.getByRole('button', { name: 'Soție', exact: true }).click();
await page.locator('.vc-input').first().fill('Ana');
await page.getByRole('button', { name: 'Aniversare de cuplu', exact: true }).click();
await page.locator('.vc-nav .vc-next').click();

await page.locator('.vc-input').first().fill('Zece ani împreună');
await page.getByRole('button', { name: /Mulțumesc pentru tot/ }).click();
await page.waitForTimeout(500);
ok('sugestia completează povestea', (await page.locator('.vc-area').inputValue()).length > 30);

await page.locator('.vc-nav .vc-next').click();
await page.locator('.vc-nav .vc-next').click();
await page.locator('.vc-nav .vc-next').click();

await page.locator('input[type=email]').fill('e2e@exemplu.md');

// legăturile stau sub bifă: deschiderea unui document nu bifează acordul
await page.locator('.vc-checkLinks a').first().click({ modifiers: ['Alt'] });
await page.waitForTimeout(300);
ok('legătura spre Termeni nu bifează acordul',
  await page.locator('#vc-agree').isChecked() === false);

// oriunde în rândul bifei, inclusiv pe mijlocul textului, comută acordul
await page.locator('.vc-checkText').first().click();
ok('apăsarea pe textul bifei comută acordul',
  await page.locator('#vc-agree').isChecked() === true);
await page.locator('.vc-nav .vc-next').click();
await page.locator('.vc-waitTitle').waitFor({ timeout: 10000 });
ok('trimiterea duce la „Se scriu versurile”',
  (await page.locator('.vc-waitTitle').textContent()).includes('versuril'));

const id = sql("select public_id from orders where email='e2e@exemplu.md'");
ok('comanda are un id public', /^[a-z2-9]{12}$/.test(id), id);
ok('acordul cu termenii e înregistrat',
  sql(`select terms_accepted_at is not null from orders where public_id='${id}'`) === 't');
ok('limita pe IP a fost numărată', Number(sql("select count from rate_limits limit 1")) === 1);

/* ─── worker-ul termină versurile ─── */

const LYRICS = '[Strofa 1]\nZece ani de dimineți cu tine,\nAna, tu ai dus tot greul bine.\n\n[Refren]\nAna, Ana, drumul nostru-i scris.';
sql(`update orders set status='lyrics_ready', song_title='Zece ani cu Ana',
     lyrics=$$${LYRICS}$$, lyrics_ready_at=now() where public_id='${id}'`);

await page.locator('.vc-lyrics').waitFor({ timeout: 12000 });
ok('pagina trece singură la versuri',
  (await page.locator('.vc-lyrics').textContent()).includes('Ana'));
ok('titlul vine de la server',
  (await page.locator('.vc-heroTitle').textContent()).includes('Zece ani cu Ana'));
ok('se văd variantele gratuite rămase',
  (await page.locator('.vc-panel').textContent()).includes('2 variante gratuite'));

/* ─── aprobarea ─── */

await page.getByRole('button', { name: /Aprobă și înregistrează/ }).first().click();
await page.locator('.vc-waitTitle', { hasText: 'Se înregistrează' }).waitFor({ timeout: 10000 });
ok('aprobarea trece comanda în rendering',
  sql(`select status from orders where public_id='${id}'`) === 'rendering');
ok('s-a pus exact un job de render', sql("select count(*) from jobs where type='render'") === '1');

/* ─── worker-ul livrează piesele ─── */

rmSync(`${DIR}/${id}`, { recursive: true, force: true });
mkdirSync(`${DIR}/${id}`, { recursive: true });
for (const v of [1, 2]) {
  const full = `${DIR}/${id}/varianta-${v}-integrala.mp3`;
  const prev = `${DIR}/${id}/varianta-${v}-preview.mp3`;
  execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', `sine=frequency=${300 + v * 140}:duration=150`,
    '-b:a', '192k', full], { stdio: 'ignore' });
  execFileSync('ffmpeg', ['-y', '-i', full, '-t', '60', '-af', 'afade=t=out:st=57:d=3',
    '-b:a', '128k', prev], { stdio: 'ignore' });
  sql(`insert into order_tracks (order_id, variant, full_path, preview_path, duration_seconds)
       select id, ${v}, '${id}/varianta-${v}-integrala.mp3', '${id}/varianta-${v}-preview.mp3', 150
       from orders where public_id='${id}'`);
}
sql(`update orders set status='preview_ready', preview_ready_at=now() where public_id='${id}'`);

await page.locator('.vc-take').first().waitFor({ timeout: 12000 });
ok('pagina trece singură la previzualizare', await page.locator('.vc-take').count() === 2);

/* ─── ascultarea ─── */

await page.locator('.vc-playBtn').first().click();
await page.waitForTimeout(2500);
const played = await page.locator('audio').first()
  .evaluate((a) => ({ time: a.currentTime, paused: a.paused, dur: a.duration }));
ok('previzualizarea chiar rulează', played.time > 0.5 && !played.paused,
  `${played.time.toFixed(1)}s`);
ok('durata afișată e cea reală', Math.round(played.dur) === 60, `${played.dur?.toFixed(1)}s`);

await page.locator('.vc-playBtn').nth(1).click();
await page.waitForTimeout(1200);
const paused = await page.locator('audio').evaluateAll((els) => els.map((a) => a.paused));
ok('o singură variantă cântă odată', paused[0] === true && paused[1] === false);

/* ─── linkurile semnate ─── */

const src = await page.locator('audio').first().getAttribute('src');
const r1 = await page.request.get(src);
ok('previzualizarea se servește', r1.status() === 200 && r1.headers()['content-type'] === 'audio/mpeg');
const r2 = await page.request.get(src, { headers: { Range: 'bytes=0-1023' } });
ok('cererea cu interval întoarce 206', r2.status() === 206, r2.headers()['content-range']);
const r3 = await page.request.get(src.replace('/preview?', '/full?'));
ok('integrala e refuzată înainte de plată', r3.status() === 403);
const r4 = await page.request.get(src.replace(/sig=[^&]+/, 'sig=mincinos'));
ok('semnătura falsificată e refuzată', r4.status() === 403);

/* ─── cumpărarea, cât timp Paddle nu e legat ─── */

await page.getByRole('button', { name: /Primește melodia/ }).first().click();
await page.locator('.vc-errTitle').waitFor({ timeout: 5000 });
ok('cumpărarea spune adevărul despre plată',
  (await page.locator('.vc-errTitle').textContent()).includes('Plata se activează'));

/* ─── după plată ─── */

sql(`update orders set status='paid', paid_at=now() where public_id='${id}'`);
const state = await page.evaluate(async (oid) => {
  const r = await fetch(`/api/orders/${oid}`, { credentials: 'same-origin' });
  return r.json();
}, id);
ok('starea marchează comanda plătită', state.paid === true);
ok('linkul integral apare abia acum', typeof state.tracks?.[0]?.fullUrl === 'string');
const r5 = await page.request.get(state.tracks[0].fullUrl);
ok('integrala se descarcă după plată', r5.status() === 200);

const lib = await page.evaluate(async () => {
  const r = await fetch('/api/orders', { credentials: 'same-origin' });
  return r.json();
});
ok('biblioteca listează comanda', lib.orders?.some((o) => o.publicId === id));

/* ─── paginile legale ─── */

for (const doc of ['termeni', 'rambursare', 'confidentialitate']) {
  const r = await page.request.get(`${BASE}/legal/ro/${doc}`);
  ok(`pagina legală „${doc}" răspunde`, r.status() === 200);
}

console.log('  → erori JS:', jsErrors.length ? jsErrors : 'niciuna');
if (jsErrors.length) fail += jsErrors.length;

console.log(`\n${pass} verificări trecute, ${fail} eșuate.`);
await browser.close();
process.exit(fail ? 1 : 0);
