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

/* Refresh-ul nu are voie să șteargă ce a completat. Înainte, comanda nu exista
   pe server până la ecranul de email, deci o pagină reîncărcată — sau un telefon
   intrat în stand-by — îl trimitea înapoi la prima întrebare, după șase pași și
   o poveste scrisă de mână. */
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);
ok('refresh-ul îl lasă în formular, nu îl duce la început',
  await page.locator('.vc-steps').count() === 1 && await page.locator('.vc-hero').count() === 0);

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
ok('limita pe IP a fost numărată',
  Number(sql("select count from rate_limits where bucket like 'lyrics:ip:%'")) === 1);
/* Limita „pe om" e cea pe browser: o adresă IP nu e un aparat, iar pe una de
   operator mobil stau mii de abonați care s-ar bloca unii pe alții. */
ok('limita se numără și pe browser, nu doar pe IP',
  Number(sql("select count(*) from rate_limits where bucket like 'lyrics:v:%'")) === 1);

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
const countVersions = () =>
  Number(sql(`select count(*) from lyrics_versions lv join orders o on o.id=lv.order_id
              where o.public_id='${id}'`));

const versionsBefore = countVersions();
await page.getByRole('button', { name: /Readu varianta asta/ }).first().click();
await page.waitForTimeout(1500);
ok('readucerea nu creează o variantă nouă, doar o alege pe cea veche',
  countVersions() === versionsBefore, `${versionsBefore} → ${countVersions()}`);

/* Înainte, fiecare readucere copia varianta ca versiune nouă. Cine se
   răzgândea de câteva ori se trezea cu rânduri identice în istoric — o listă
   care nu mai arăta variantele scrise, ci de câte ori a apăsat. Ne oprim pe
   varianta 1, ca textul curent să difere de cel înregistrat. */
await page.evaluate(async (oid) => {
  for (const version of [2, 1, 2, 1]) {
    await fetch(`/api/orders/${oid}/lyrics/restore`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version }),
    });
  }
}, id);
await page.waitForTimeout(800);
ok('readucerile repetate nu adună copii identice',
  countVersions() === versionsBefore, `${versionsBefore} → ${countVersions()}`);
ok('comanda arată varianta readusă, nu una nouă',
  sql(`select lyrics_version from orders where public_id='${id}'`) === '1');

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
/* ─── plata: link MAIB, apoi confirmarea făcută cu mâna ─── */

/* Linkul MAIB e același pentru toți și nu ne anunță nimic când se plătește.
   De asta fluxul are trei timpi: clientul deschide linkul, clientul spune că a
   plătit, iar noi deblocăm de pe Telegram după ce vedem banii. Testul ține cel
   mai mult la un singur lucru: între primii doi timpi melodia rămâne închisă. */

const TG_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? 'telegram_test_secret';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID ?? '111222333';

/** Id unic per rulare, ca două rulări să nu se calce pe idempotență. */
const RUN = Date.now().toString(36);
let updateId = Number.parseInt(RUN.slice(-6), 36) * 100;

/** O apăsare de buton, așa cum o trimite Telegram. */
const press = (data, { chat = TG_CHAT, secret = TG_SECRET, id = ++updateId } = {}) =>
  page.request.post(`${BASE}/api/webhooks/telegram`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': secret,
    },
    data: JSON.stringify({
      update_id: id,
      callback_query: {
        id: `cb_${id}`,
        data,
        from: { id: 42, username: 'e2e' },
        message: { message_id: id, chat: { id: chat } },
      },
    }),
  });

await page.getByRole('button', { name: /Primește melodia/ }).first().click();
await page.locator('.vc-payPanel').waitFor({ timeout: 15000 });
ok('butonul de cumpărare deschide panoul de plată',
  await page.locator('.vc-payPanel').count() === 1);
ok('panoul arată linkul de plată',
  (await page.locator('.vc-payPanel a.vc-buy').getAttribute('href')).startsWith('http'));
ok('panoul arată emailul după care se potrivește plata',
  (await page.locator('.vc-payMatchValue').textContent()).includes('@'));
ok('deschiderea linkului nu plătește nimic',
  sql(`select status from orders where public_id='${id}'`) === 'preview_ready');
await shot('panou-plata');

await page.getByRole('button', { name: /Am efectuat achitarea/ }).click();
await page.locator('.vc-payWait').waitFor({ timeout: 15000 });
ok('„am plătit" pune comanda în așteptare, nu în plătită',
  sql(`select status from orders where public_id='${id}'`) === 'payment_claimed');

/* Aici e toată miza: browserul a spus că a plătit, și nu s-a deschis nimic. */
const claimed = await page.evaluate(async (oid) => {
  const r = await fetch(`/api/orders/${oid}`, { credentials: 'same-origin' });
  return r.json();
}, id);
ok('browserul nu poate debloca singur melodia', claimed.paid === false);
ok('fișierul integral rămâne închis cât timp plata nu e confirmată',
  claimed.tracks?.[0]?.fullUrl == null);

/* ─── respingerea îl scoate pe client din așteptare ─── */

/* Prima dată, pagina rămânea blocată în „verificăm plata" până la reîncărcare:
   bucla care întreba serverul se uita doar după „plătit", iar întoarcerea la
   previzualizare trecea pe lângă ea. Omul aștepta degeaba, fără să afle nimic. */
const refuz = await press(`no:${id}`);
ok('apăsarea pe „respinge" e acceptată', refuz.status() === 200);
ok('comanda se întoarce la previzualizare',
  sql(`select status from orders where public_id='${id}'`) === 'preview_ready');

await page.locator('.vc-payWait').waitFor({ state: 'detached', timeout: 20000 })
  .catch(() => {});
ok('pagina iese singură din așteptare după respingere',
  await page.locator('.vc-payWait').count() === 0);
ok('clientului i se spune de ce',
  (await page.locator('.vc-alert').textContent().catch(() => '')).includes('Nu am găsit plata'));

/* Poate încerca din nou. De data asta NU mai apasă „am efectuat achitarea":
   sunt clienți care plătesc și închid pagina fără să confirme nimic, iar
   deblocarea trebuie să ajungă la ei oricum. */
await page.getByRole('button', { name: /Primește melodia/ }).first().click();
await page.locator('.vc-payPanel').waitFor({ timeout: 15000 });
ok('poate redeschide plata după o respingere',
  sql(`select status from orders where public_id='${id}'`) === 'preview_ready');

/* Adresa de webhook e cea mai periculoasă din proiect: cine o poate chema poate
   debloca melodii pe gratis. Fără secretul potrivit, nu răspunde nimic. */
const fakeSecret = await press(`ok:${id}`, { secret: 'a'.repeat(32) });
ok('apăsarea fără secretul potrivit e refuzată', fakeSecret.status() === 401);
ok('apăsarea falsă nu a deblocat nimic',
  sql(`select status from orders where public_id='${id}'`) === 'preview_ready');

/* Secretul e bun, dar apăsarea vine din alt chat: tot nu are voie. */
const otherChat = await press(`ok:${id}`, { chat: '999000999' });
ok('apăsarea din alt chat nu deblochează',
  otherChat.status() === 200
  && sql(`select status from orders where public_id='${id}'`) === 'preview_ready');

const unlockId = ++updateId;
const unlocked = await press(`ok:${id}`, { id: unlockId });
ok('apăsarea pe „deblochează" e acceptată', unlocked.status() === 200);
ok('comanda devine plătită', sql(`select status from orders where public_id='${id}'`) === 'paid');
ok('plata e înregistrată cu suma corectă',
  sql(`select amount_cents||' '||currency from payments p join orders o on o.id=p.order_id
       where o.public_id='${id}'`) === '3000 EUR');
ok('livrarea a intrat în coadă',
  sql(`select count(*) from jobs where type='deliver'`) === '1');
ok('comanda plătită se păstrează 24 de luni',
  Number(sql(`select round(extract(epoch from (expires_at - now()))/86400) from orders
              where public_id='${id}'`)) > 700);

/* Aici e schimbarea care contează: clientul n-a apăsat nimic. A deschis linkul
   de plată, a plătit și a lăsat pagina deschisă. Deblocarea de pe Telegram
   trebuie să ajungă la el singură — înainte, pagina lui nu întreba deloc
   serverul cât timp nu anunțase o plată, deci rămânea cu panoul deschis. */
await page.locator('.vc-doneTitle').waitFor({ timeout: 25000 }).catch(() => {});
ok('melodia i se deschide singură, fără ca el să fi confirmat plata',
  await page.locator('.vc-doneTitle').count() === 1);

/* Înainte de plată, reluările erau consumate până la zero (vezi mai sus). Cine
   a dat 30 € are dreptul la încă o interpretare a aceleiași piese. */
ok('plata pune la loc încercările consumate',
  Number(sql(`select renders_left from orders where public_id='${id}'`)) > 0);

/* Telegram retrimite până primește 200: a doua livrare nu are voie să facă nimic. */
const again = await press(`ok:${id}`, { id: unlockId });
ok('aceeași apăsare trimisă de două ori nu se procesează de două ori',
  again.status() === 200 && sql(`select count(*) from jobs where type='deliver'`) === '1');

const state = await page.evaluate(async (oid) => {
  const r = await fetch(`/api/orders/${oid}`, { credentials: 'same-origin' });
  return r.json();
}, id);
ok('starea marchează comanda plătită', state.paid === true);
ok('linkul integral apare abia acum', typeof state.tracks?.[0]?.fullUrl === 'string');
const r5 = await page.request.get(state.tracks[0].fullUrl);
ok('integrala se descarcă după plată', r5.status() === 200);

/* ─── întoarcerea de la plată ─── */

/* Pagina pe care te lasă procesatorul după ce ai plătit. Se verifică într-un
   browser fără cookie-uri, pentru ca adresa sa fie singura dovadă: cookie-ul
   comenzii e „SameSite=lax" și nu se trimite la o navigare dintr-un cadru, iar
   fereastra de plată e un cadru. Prima oară pagina raspundea 404, cu melodia
   platita si inaccesibila. */
{
  const token = sql(`select access_token from orders where public_id='${id}'`);

  const fresh = await browser.newContext({ viewport: { width: 400, height: 900 } });
  const back = await fresh.newPage();
  const resp = await back.goto(`${BASE}/comanda/${id}?t=${token}`, { waitUntil: 'domcontentloaded' });
  ok('întoarcerea de la plată nu dă 404', resp.status() === 200, String(resp.status()));
  await back.locator('.vc-doneTitle').waitFor({ timeout: 15000 }).catch(() => {});
  ok('întoarcerea de la plată arată livrarea',
    await back.locator('.vc-doneTitle').count() === 1);
  await fresh.close();

  /* Iar fără secret în adresă, aceeași pagină nu se deschide nimănui. */
  const stranger = await browser.newContext({ viewport: { width: 400, height: 900 } });
  const nosy = await stranger.newPage();
  const denied = await nosy.goto(`${BASE}/comanda/${id}`, { waitUntil: 'domcontentloaded' });
  ok('fără secret în adresă, comanda rămâne închisă', denied.status() === 404, String(denied.status()));
  await stranger.close();
}

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

/* Banii se dau înapoi din MAIB, cu mâna. Ce trebuie să facă site-ul e să închidă
   accesul, iar asta se cere tot de pe Telegram: aceeași apăsare pe „respinge",
   de data asta pe o comandă deja deblocată. */
const refunded = await press(`no:${id}`);
ok('rambursarea de pe Telegram e acceptată', refunded.status() === 200);
ok('plata e marcată rambursată',
  sql(`select p.status from payments p join orders o on o.id=p.order_id where o.public_id='${id}'`) === 'refunded');
ok('comanda se întoarce la previzualizare',
  sql(`select status from orders where public_id='${id}'`) === 'preview_ready');
ok('comanda rambursată revine la retenția de 30 de zile',
  Number(sql(`select round(extract(epoch from (expires_at - now()))/86400) from orders
              where public_id='${id}'`)) < 40);
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
  /* Prețul nu mai are secțiune proprie: stă în rândul de sub butonul din antet.
     Verificarea rămâne aceeași în fond — omul trebuie să vadă 30 € fără să
     completeze nimic, altfel află abia după șase pași. */
  ok('pretul se vede fara sa completezi nimic',
    (await en.locator('.vc-heroPrice').textContent()).includes('30'));
  ok('meniul duce la cele doua sectiuni',
    await en.locator('.vc-nav2 a').count() === 2);
  /* Biblioteca se ajungea doar de pe ecranul de livrare, adică doar după ce
     plăteai. Cine se întoarce peste o săptămână o caută în meniu. */
  ok('biblioteca se ajunge din meniu, nu doar după plată',
    await en.locator('.vc-navBtn').count() === 1);
  ok('biblioteca se ajunge și din subsol',
    await en.locator('.vc-footBtn').count() === 1);
  for (const id of ['how', 'faq']) {
    ok(`sectiunea „${id}" exista pe pagina`, await en.locator(`#${id}`).count() === 1);
  }
  ok('pretul si melodiile demo nu mai au sectiuni separate',
    await en.locator('#pricing').count() === 0
    && await en.locator('#samples').count() === 0);
  ok('sunt opt intrebari frecvente', await en.locator('.vc-faqItem').count() === 8);
  /* Mențiunea că vocile sunt sintetice stătea sub melodiile demo. Odată cu ele
     a plecat și ea de acolo, dar rămâne obligatorie — acum o poartă a patra
     întrebare frecventă, și de acolo o verificăm. */
  ok('se spune că vocile sunt sintetice',
    (await en.locator('.vc-faqItem').nth(3).textContent()).toLowerCase().includes('synthetic'));
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
