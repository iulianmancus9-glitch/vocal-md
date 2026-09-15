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
import { createHmac } from 'node:crypto';
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

// webhook_events nu atârnă de comenzi, deci nu pleacă în cascadă — dar dacă
// rămâne, a doua rulare vede evenimentele ca deja procesate și nu face nimic.
sql('truncate orders cascade; truncate jobs; truncate rate_limits; truncate webhook_events;');
rmSync(DIR, { recursive: true, force: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 400, height: 900 } });

/* Textele căutate mai jos sunt cele românești, deci pagina trebuie cerută în
   română — altfel testul ar depinde de `DEFAULT_LANG` și s-ar rupe în ziua în
   care se schimbă limba implicită a site-ului, fără ca ceva să fie stricat. */
await page.context().addCookies([{ name: 'lang', value: 'ro', url: BASE }]);
/** Cu SHOTS=1 se salvează câteva capturi, ca să se poată privi rezultatul. */
const SHOTS = process.env.SHOTS === '1';
const shotDir = process.env.SHOT_DIR ?? '.';
let shotNo = 0;
const shot = async (name) => {
  if (!SHOTS) return;
  await page.screenshot({ path: `${shotDir}/${String(++shotNo).padStart(2, '0')}-${name}.png`, fullPage: true });
};

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

// Sugestiile stau pliate până le ceri.
ok('sugestiile sunt ascunse la început',
  !(await page.getByRole('button', { name: /Mulțumesc pentru tot/ }).isVisible()));
await page.locator('.vc-modFold summary').click();
await page.waitForTimeout(300);
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

/* Worker-ul scrie fiecare variantă în `lyrics_versions`, nu doar pe comandă —
   altfel istoricul ar fi gol și nu s-ar putea reveni la nimic. Simulăm două
   variante, ca a doua să fie cea curentă și prima să rămână în istoric. */
const LYRICS_1 = '[Strofa 1]\nO primă încercare de text,\nAna, aici era altfel scris.\n\n[Refren]\nAna, Ana, prima variantă.';
const LYRICS = '[Strofa 1]\nZece ani de dimineți cu tine,\nAna, tu ai dus tot greul bine.\n\n[Refren]\nAna, Ana, drumul nostru-i scris.';

sql(`insert into lyrics_versions (order_id, version, source, title, lyrics)
     select id, 1, 'ai', 'Prima variantă', $$${LYRICS_1}$$ from orders where public_id='${id}'`);
sql(`insert into lyrics_versions (order_id, version, source, title, lyrics)
     select id, 2, 'ai_regen', 'Zece ani cu Ana', $$${LYRICS}$$ from orders where public_id='${id}'`);
sql(`update orders set status='lyrics_ready', song_title='Zece ani cu Ana', lyrics_version=2,
     regens_left=1, lyrics=$$${LYRICS}$$, lyrics_ready_at=now() where public_id='${id}'`);

await page.locator('.vc-lyrics').waitFor({ timeout: 12000 });
ok('pagina trece singură la versuri',
  (await page.locator('.vc-lyrics').textContent()).includes('Ana'));
ok('titlul vine de la server',
  (await page.locator('.vc-heroTitle').textContent()).includes('Zece ani cu Ana'));
ok('se vede câte variante gratuite au rămas',
  (await page.locator('.vc-panel').textContent()).includes('1 variantă gratuită'));
ok('istoricul apare încă de la ecranul de versuri', await page.locator('.vc-hist').count() === 1);

/* ─── aprobarea ─── */

await page.getByRole('button', { name: /Aprobă și înregistrează/ }).first().click();
await page.locator('.vc-waitTitle', { hasText: 'Se înregistrează' }).waitFor({ timeout: 10000 });
ok('aprobarea trece comanda în rendering',
  sql(`select status from orders where public_id='${id}'`) === 'rendering');
ok('s-a pus exact un job de render', sql("select count(*) from jobs where type='render'") === '1');

/* ─── worker-ul livrează piesele ─── */

rmSync(`${DIR}/${id}`, { recursive: true, force: true });
mkdirSync(`${DIR}/${id}`, { recursive: true });
/** Ce face worker-ul: descarcă piesele și marchează înregistrarea terminată. */
function deliverRecording(generation) {
  const renderId = sql(`select r.id from renders r join orders o on o.id=r.order_id
                        where o.public_id='${id}' and r.generation=${generation}`);
  for (const v of [1, 2]) {
    const base = `${DIR}/${id}/inregistrarea-${generation}-varianta-${v}`;
    execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i',
      `sine=frequency=${200 + generation * 90 + v * 140}:duration=150`, '-b:a', '192k',
      `${base}-integrala.mp3`], { stdio: 'ignore' });
    execFileSync('ffmpeg', ['-y', '-i', `${base}-integrala.mp3`, '-t', '60',
      '-af', 'afade=t=out:st=57:d=3', '-b:a', '128k', `${base}-preview.mp3`], { stdio: 'ignore' });
    sql(`insert into order_tracks (order_id, render_id, variant, full_path, preview_path, duration_seconds)
         select o.id, '${renderId}', ${v},
                '${id}/inregistrarea-${generation}-varianta-${v}-integrala.mp3',
                '${id}/inregistrarea-${generation}-varianta-${v}-preview.mp3', 150
         from orders o where o.public_id='${id}'`);
  }
  sql(`update renders set status='done', completed_at=now() where id='${renderId}'`);
  // Worker-ul ar închide și jobul; fără asta, indexul anti-dublură refuză pe drept
  // o a doua înregistrare, crezând că prima încă se lucrează.
  sql(`update jobs set status='done', finished_at=now()
       where type='render' and status in ('queued','running')
         and order_id=(select id from orders where public_id='${id}')`);
  sql(`update orders set status='preview_ready', preview_ready_at=coalesce(preview_ready_at, now()),
       current_render_id='${renderId}' where public_id='${id}'`);
  return renderId;
}

deliverRecording(1);

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

/* ─── încă o înregistrare, și întoarcerea la cea veche ─── */

const before = await page.locator('audio').first().getAttribute('src');
await page.getByRole('button', { name: /Altă înregistrare/ }).click();
await page.locator('.vc-waitTitle', { hasText: 'Se înregistrează' }).waitFor({ timeout: 10000 });
ok('reluarea pornește o înregistrare nouă',
  sql(`select count(*) from renders r join orders o on o.id=r.order_id where o.public_id='${id}'`) === '2');
ok('reluările rămase au scăzut',
  sql(`select renders_left from orders where public_id='${id}'`) === '1');

deliverRecording(2);
await page.locator('.vc-takeTab').first().waitFor({ timeout: 14000 });
ok('apar ambele înregistrări de ales', await page.locator('.vc-takeTab').count() === 2);
const after = await page.locator('audio').first().getAttribute('src');
ok('se ascultă înregistrarea nouă', after !== before && after.includes('/2/'));

await page.locator('.vc-takeTab').first().click();
await page.waitForTimeout(1500);
const back = await page.locator('audio').first().getAttribute('src');
ok('te poți întoarce la prima înregistrare', back.includes('/1/'));
ok('alegerea e ținută minte de server',
  sql(`select r.generation from renders r join orders o on o.id=r.order_id
       where o.current_render_id=r.id and o.public_id='${id}'`) === '1');

/* ─── istoricul versurilor ─── */

await page.getByRole('button', { name: /Vezi versurile/ }).click();
await page.locator('.vc-lyrics').waitFor({ timeout: 5000 });
ok('după înregistrare, textul nu se mai poate edita',
  await page.getByRole('button', { name: /Modifică acest text/ }).count() === 0);
ok('se vede istoricul variantelor', await page.locator('.vc-hist').count() === 1);
await page.locator('.vc-hist summary').click();
await page.waitForTimeout(300);
await shot('istoric-versuri');
await page.getByRole('button', { name: /Readu varianta asta/ }).first().click();
await page.waitForTimeout(1500);
ok('readucerea unei variante creează o versiune nouă, fără să piardă nimic',
  Number(sql(`select count(*) from lyrics_versions lv join orders o on o.id=lv.order_id
              where o.public_id='${id}'`)) >= 3);

// Portița: dacă readucerea ar da comanda înapoi în „lyrics_ready", aprobarea ar
// porni înregistrări la nesfârșit, fără să scadă limita.
ok('readucerea nu întoarce comanda în starea de dinainte de înregistrare',
  sql(`select status from orders where public_id='${id}'`) === 'preview_ready');
const rendersBefore = sql(`select count(*) from renders r join orders o on o.id=r.order_id
                           where o.public_id='${id}'`);
await page.evaluate(async (oid) => {
  await fetch(`/api/orders/${oid}/approve`, { method: 'POST', credentials: 'same-origin' });
}, id);
const rendersAfter = sql(`select count(*) from renders r join orders o on o.id=r.order_id
                          where o.public_id='${id}'`);
ok('aprobarea nu mai poate porni o înregistrare pe gratis', rendersBefore === rendersAfter);

ok('butonul cere înregistrarea textului readus',
  await page.getByRole('button', { name: /Înregistrează varianta asta/ }).count() > 0);

await page.getByRole('button', { name: /Înregistrează varianta asta/ }).first().click();
await page.locator('.vc-waitTitle', { hasText: 'Se înregistrează' }).waitFor({ timeout: 10000 });
ok('textul readus consumă o reluare, ca oricare alta',
  sql(`select renders_left from orders where public_id='${id}'`) === '0');

deliverRecording(3);
await page.locator('.vc-take').first().waitFor({ timeout: 14000 });
ok('a treia înregistrare apare lângă celelalte', await page.locator('.vc-takeTab').count() === 3);
await shot('trei-inregistrari');
ok('reluările s-au terminat',
  (await page.locator('.vc-takesFoot').textContent()).includes('folosit toate'));

/* ─── butonul de cumpărare ─── */

/* Cheile din test sunt inventate, deci procesatorul refuză. Ce contează e că refuzul
   se vede ca mesaj, nu ca pagină ruptă — și, mai ales, că browserul nu poate
   marca singur comanda ca plătită. */
await page.getByRole('button', { name: /Primește melodia/ }).first().click();
await page.locator('.vc-alert').waitFor({ timeout: 15000 });
ok('un eșec la plată se vede ca mesaj, nu strică pagina',
  (await page.locator('.vc-alert').textContent()).length > 10);
ok('browserul nu poate marca singur comanda ca plătită',
  sql(`select status from orders where public_id='${id}'`) === 'preview_ready');

/* ─── plata, prin webhook semnat ca al lui Lemon Squeezy ─── */

const SECRET = process.env.LEMON_WEBHOOK_SECRET ?? 'lemon_test_secret';

/** Semnătura pe care o pune Lemon Squeezy: hmac-sha256 hex peste corpul brut. */
const lemonSigned = (body) => createHmac('sha256', SECRET).update(body).digest('hex');

/** Id unic per rulare, ca două rulări să nu se calce pe idempotență. */
const RUN = Date.now().toString(36);

const ORDER_ID = `lsorder_${RUN}`;

const paidEvent = () => JSON.stringify({
  meta: { event_name: 'order_created', custom_data: { order_id: id } },
  data: {
    id: ORDER_ID,
    type: 'orders',
    attributes: {
      status: 'paid',
      customer_id: 991,
      total: 3000,
      currency: 'EUR',
      user_email: 'e2e@exemplu.md',
    },
  },
});

const body1 = paidEvent();
const hook1 = await page.request.post(`${BASE}/api/webhooks/lemon`, {
  headers: { 'Content-Type': 'application/json', 'X-Signature': lemonSigned(body1) },
  data: body1,
});
ok('webhook-ul semnat corect e acceptat', hook1.status() === 200);
ok('comanda devine plătită', sql(`select status from orders where public_id='${id}'`) === 'paid');
ok('plata e înregistrată cu suma corectă',
  sql(`select amount_cents||' '||currency from payments p join orders o on o.id=p.order_id
       where o.public_id='${id}'`) === '3000 EUR');
ok('livrarea a intrat în coadă',
  sql(`select count(*) from jobs where type='deliver'`) === '1');
ok('comanda plătită se păstrează 24 de luni',
  Number(sql(`select round(extract(epoch from (expires_at - now()))/86400) from orders
              where public_id='${id}'`)) > 700);

/* Retrimit până primesc 200: a doua livrare nu are voie să facă nimic. */
const hook2 = await page.request.post(`${BASE}/api/webhooks/lemon`, {
  headers: { 'Content-Type': 'application/json', 'X-Signature': lemonSigned(body1) },
  data: body1,
});
ok('același eveniment trimis de două ori nu se procesează de două ori',
  hook2.status() === 200 && sql(`select count(*) from jobs where type='deliver'`) === '1');

/* O semnătură falsificată nu are voie să deblocheze nimic. */
const body3 = JSON.stringify({
  meta: { event_name: 'order_created', custom_data: { order_id: id } },
  data: { id: `lsorder_${RUN}_fals`, attributes: { status: 'paid', total: 3000, currency: 'EUR' } },
});
const hook3 = await page.request.post(`${BASE}/api/webhooks/lemon`, {
  headers: { 'Content-Type': 'application/json', 'X-Signature': 'a'.repeat(64) },
  data: body3,
});
ok('webhook-ul cu semnătură falsă e refuzat', hook3.status() === 401);
ok('evenimentul fals nu a fost înregistrat',
  sql(`select count(*) from webhook_events
       where event_id='order_created:lsorder_${RUN}_fals'`) === '0');
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

const key0 = process.env.EXPORT_KEY ?? 'cheie-de-test-12345';
const soldNow = await page.request.get(`${BASE}/api/export/comenzi.csv?key=${key0}`);
ok('comanda plătită apare la vândute',
  soldNow.status() === 200 && (await soldNow.text()).includes(id));

/* ─── rambursarea închide accesul ─── */

/* Rambursarea vine pe aceeași comandă, deci cheia de idempotență trebuie să
   difere prin numele evenimentului — altfel ar fi înghițită ca duplicat. */
const refundBody = JSON.stringify({
  meta: { event_name: 'order_refunded', custom_data: { order_id: id } },
  data: {
    id: ORDER_ID,
    type: 'orders',
    attributes: { status: 'refunded', total: 3000, refunded_amount: 3000, currency: 'EUR' },
  },
});
const hook4 = await page.request.post(`${BASE}/api/webhooks/lemon`, {
  headers: { 'Content-Type': 'application/json', 'X-Signature': lemonSigned(refundBody) },
  data: refundBody,
});
ok('rambursarea e acceptată', hook4.status() === 200);
ok('plata e marcată rambursată',
  sql(`select p.status from payments p join orders o on o.id=p.order_id where o.public_id='${id}'`) === 'refunded');
ok('comanda se întoarce la previzualizare',
  sql(`select status from orders where public_id='${id}'`) === 'preview_ready');
const fullUrl = state.tracks?.[0]?.fullUrl;
if (fullUrl) {
  const afterRefund = await page.request.get(fullUrl);
  ok('fișierul integral nu se mai descarcă după rambursare', afterRefund.status() === 402);
} else {
  ok('fișierul integral nu se mai descarcă după rambursare', false, 'lipsește linkul');
}

/* ─── exportul pentru foaia de calcul ─── */

const key = process.env.EXPORT_KEY ?? 'cheie-de-test-12345';
const exp1 = await page.request.get(`${BASE}/api/export/incercari.csv?key=${key}`);
const csv = await exp1.text();
ok('exportul „incercari" răspunde', exp1.status() === 200);
ok('exportul are antet și cel puțin un rând', csv.split('\r\n').length >= 2);
ok('exportul conține comanda de test', csv.includes(id));
ok('exportul fără cheie e refuzat',
  (await page.request.get(`${BASE}/api/export/incercari.csv`)).status() === 403);
// „comenzi" se verifică în două momente, pentru că răspunsul trebuie să se
// schimbe: o comandă rambursată nu mai e o vânzare.
const exp2 = await page.request.get(`${BASE}/api/export/comenzi.csv?key=${key}`);
ok('comanda rambursată nu mai apare la vândute',
  exp2.status() === 200 && !(await exp2.text()).includes(id));

/* ─── paginile legale ─── */

for (const doc of ['termeni', 'rambursare', 'confidentialitate']) {
  const r = await page.request.get(`${BASE}/legal/ro/${doc}`);
  ok(`pagina legală „${doc}" răspunde`, r.status() === 200);
}

/* ─── site-ul în engleză ─── */

/* Engleza e limba pe care o vede un vizitator nou, deci merită mai mult decât
   încredere. Nu reluăm tot formularul în engleză: ce se putea strica la
   traducere sunt etichetele, iar drumul prin server e același. */
{
  const en = await browser.newPage({ viewport: { width: 400, height: 900 } });
  const enErrors = [];
  en.on('pageerror', (e) => enErrors.push(String(e)));
  await en.context().addCookies([{ name: 'lang', value: 'en', url: BASE }]);
  await en.goto(BASE, { waitUntil: 'domcontentloaded' });
  await en.waitForTimeout(400);

  ok('pagina de start se dă în engleză',
    await en.getByRole('button', { name: /Create your song/i }).count() === 1);
  ok('sectiunea de pret spune ce se livreaza',
    (await en.locator('.vc-priceBox').textContent()).includes('Two MP3 files'));
  ok('pretul se vede fara sa completezi nimic',
    (await en.locator('.vc-priceBig').textContent()).includes('30'));
  ok('meniul duce la cele patru sectiuni',
    await en.locator('.vc-nav2 a').count() === 4);
  for (const id of ['pricing', 'samples', 'how', 'faq']) {
    ok(`sectiunea „${id}" exista pe pagina`, await en.locator(`#${id}`).count() === 1);
  }
  ok('sunt opt intrebari frecvente', await en.locator('.vc-faqItem').count() === 8);
  ok('se spune că vocile sunt sintetice',
    (await en.locator('.vc-demoFoot').textContent()).toLowerCase().includes('synthetic'));
  ok('bannerul de cookie-uri e în engleză',
    await en.getByRole('button', { name: 'Necessary only' }).count() === 1);
  ok('comutatorul oferă româna', await en.locator('.vc-lang').first().textContent() === 'Română');

  /* Etichetele alegerilor se traduc, dar valorile trimise serverului nu: zod le
     verifică drept enumerări românești, iar promptul lui Suno se face din ele. */
  await en.getByRole('button', { name: 'Necessary only' }).click();
  await en.getByRole('button', { name: /Create your song/i }).click();
  await en.getByRole('button', { name: /Heartfelt/ }).first().click();
  await en.locator('.vc-nav .vc-next').click();
  await en.waitForTimeout(300);
  ok('sub-stilurile apar traduse',
    await en.getByRole('button', { name: 'Acoustic ballad', exact: true }).count() === 1);
  ok('stările de spirit apar traduse',
    await en.getByRole('button', { name: 'Grateful', exact: true }).count() === 1);

  /* Comutatorul nu aruncă ce a completat omul: schimbă doar limba paginii. */
  await en.getByRole('button', { name: 'Acoustic ballad', exact: true }).click();
  await en.locator('.vc-lang').first().click();
  await en.waitForTimeout(800);
  ok('comutarea păstrează pasul și alegerea',
    (await en.locator('.vc-stepNow').textContent()) === 'Personalizare'
    && await en.getByRole('button', { name: 'Baladă acustică', exact: true })
         .getAttribute('data-on') === '1');

  ok('engleza nu produce erori JS', enErrors.length === 0, enErrors.join(' | '));
  await en.close();
}

for (const doc of ['termeni', 'rambursare', 'confidentialitate']) {
  const r = await page.request.get(`${BASE}/legal/en/${doc}`);
  ok(`documentul „${doc}" există și în engleză`, r.status() === 200);
}

console.log('  → erori JS:', jsErrors.length ? jsErrors : 'niciuna');
if (jsErrors.length) fail += jsErrors.length;

console.log(`\n${pass} verificări trecute, ${fail} eșuate.`);
await browser.close();
process.exit(fail ? 1 : 0);
