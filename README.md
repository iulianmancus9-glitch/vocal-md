# VOCAL MD

Site unde oamenii comandă melodii personalizate. Formular în șase pași, versuri
gratuite scrise de Gemini, melodia întreagă de ascultat gratuit cu o semnătură
sonoră peste ea, apoi 30 € pentru fișierele curate, printr-un link de plată MAIB.

Next.js + PostgreSQL, în Docker, pe VPS Ubuntu 24.04. Caddy termină HTTPS pe gazdă.

---

## Cum e împărțit

```
src/
  app/                 paginile și rutele API (Next, App Router)
    api/orders/        creare comandă, stare, versuri, aprobare
    api/audio/         fișierele audio, prin linkuri semnate
    api/health/        verificarea folosită de compose și de monitorizare
    legal/             Termenii, rambursarea, confidențialitatea (RO și EN)
  components/          formularul în șase pași și bannerul de cookie-uri
  lib/
    db/                schema, conexiunea, migrările, identificatorii publici
    pipeline/          lanțul testat: prompt → Gemini → Suno → ffmpeg
    queue/             coada de joburi și handler-ele ei
    env.ts             configurarea, validată la pornire
    orders.ts          operații mărunte pe comenzi
    storage.ts         fișierele audio și linkurile semnate
  worker/              procesul care execută coada, container separat
drizzle/               migrările SQL generate
scripts/               verificarea schemei
deploy/                Caddyfile, backup
content/legal/         Termenii, rambursarea, confidențialitatea (textul valabil)
reference/             prototipul original, înghețat ca material sursă
```

Regula după care e împărțit totul: **web-ul nu așteaptă niciodată un furnizor extern.**
Pune un job în coadă și răspunde imediat. Worker-ul e cel care stă cele două-trei
minute cât durează o generare Suno. Altfel, o cerere HTTP ar trebui ținută deschisă
minute întregi, iar un reverse proxy sau un telefon care intră în stand-by ar rupe-o.

---

## Baza de date

Nouă tabele. Firul unei comenzi:

```
orders ──┬── lyrics_versions   fiecare generare sau editare a versurilor
         ├── renders ──┬────── o înregistrare = un task Suno = două variante
         │             └── order_tracks   piesele ei, cu previzualizările
         ├── payments          tranzacția, așa cum a fost confirmată
         ├── emails            ce i-am trimis clientului și dacă a plecat
         └── order_events      urma auditabilă: ce s-a întâmplat și când

jobs             coada worker-ului
webhook_events   idempotență pentru Telegram și Suno
rate_limits      apărarea previzualizării gratuite
```

Drumul normal al unei comenzi, prin coloana `status`:

```
draft → lyrics_pending → lyrics_ready → rendering → preview_ready → payment_claimed → paid → delivered
```

Ramurile scurte: `refused` (filtru de conținut), `failed` (eroare tehnică),
`expired` (retenție).

Cinci decizii care nu sunt evidente din schemă:

**Fiecare încercare rămâne.** Clientul poate cere până la trei înregistrări ale
aceleiași piese și poate reveni la oricare — de asta `renders` e un tabel, nu
câteva coloane pe comandă, iar numele fișierelor poartă generația. Alegerea stă
pe server (`current_render_id`), pentru că e melodia pe care o primește la
livrare. Fiecare reluare costă credite Suno reale, deci numărul lor e o manetă
de business: `MAX_EXTRA_RENDERS` în `.env`.

**Banii nu se pot cheltui de două ori.** O previzualizare e gratuită pentru client,
dar fiecare apăsare consumă credite Suno plătite de noi. Indexul parțial
`jobs_active_key` face ca aceeași comandă să nu poată avea două joburi de același tip
în lucru, deci un dublu-click nu produce două generări. Peste el, `rate_limits`
numără pe patru niveluri, în ordinea asta:

1. **pe tot site-ul** — frâna de mână pe bani. Singura limită pe care n-o poate
   ocoli nimeni: nici cine șterge cookie-uri, nici cine schimbă adresa, nici
   cine inventează emailuri. Când se atinge, pleacă un mesaj pe Telegram.
2. **pe browser** (`vocal_v`, cookie httpOnly) — asta e limita „pe om".
3. **pe IP** — plasă de siguranță, nu limită „pe om". O adresă IP nu e un
   aparat: o familie pe wi-fi iese pe una singură, iar un operator de mobil
   trece mii de abonați prin câteva. Ținută jos, blochează oameni străini unii
   de alții — de asta e largă.
4. **pe email** — împotriva celui care schimbă browserul dar nu și adresa.

Cine a plătit vreodată de pe browserul respectiv sare peste 2, 3 și 4:
limitele apără previzualizarea gratuită de cine vine s-o consume degeaba, iar
un om care a dat 30 € nu e acela. Se citește din comenzile pe care le știe
cookie-ul, deci nimeni nu poate pretinde că a plătit — i-ar trebui secretul
unei comenzi plătite.

**Renunțarea la retragere se dovedește cu o coloană.** `withdrawal_waived_at` și
`terms_accepted_at` se scriu la checkout, împreună cu `legal_version` și IP-ul.
Fără ele nu putem susține, în fața nimănui, că s-a renunțat la dreptul de retragere
de 14 zile. Politica spune că se poate renunța *pentru că* omul a ascultat gratuit
înainte să plătească — deci ordinea pașilor din bază trebuie să arate exact asta.

**Retenția e o dată, nu o intenție.** `expires_at` se scrie la creare (30 de zile) și
se rescrie la plată (24 de luni), exact cum spune Politica de confidențialitate.
Jobul `cleanup` șterge ce a trecut de termen, întâi fișierele, apoi rândul.

**Fișierele Suno sunt la noi, nu la ei.** Linkurile lor expiră în 14 zile, dar noi
promitem 24 de luni de redescărcare. De asta `render` descarcă ambele variante pe
volum imediat, iar `source_url` rămâne doar ca urmă.

Schema se verifică singură:

```bash
createdb vocalmd_test
CONFIRM_WIPE=1 DATABASE_URL=postgres://.../vocalmd_test npm run db:verify
```

26 de verificări: indexul care oprește dublul-click, preluarea din coadă cu doi
worker-i, reîncercările cu pauză, ștergerile în cascadă, linkurile semnate.
Scriptul golește tabele, de asta refuză orice bază care nu are „test" sau „dev"
în nume.

---

## Pipeline-ul

Codul din `src/lib/pipeline/` e cel testat în arhiva de probă, portat în TypeScript
fără schimbări de conținut. Cele trei manete de reglaj sunt aceleași:

- **`GEMINI_TEMPERATURE`** în `.env` — între 0.85 și 1.0. Mai jos iese plat, mai sus haotic.
- **`SYSTEM_PROMPT`** în `src/lib/pipeline/prompt.ts` — regulile de scriere.
- **`STYLE_MAP`** tot acolo — cuvintele trimise la Suno pentru fiecare gen.
  Aici sunt cele mai mari câștiguri de calitate.

Ce e nou față de scriptul de probă: la regenerare trimitem explicit un alt unghi
(`REGEN_HINT`) și variantele deja respinse, altfel modelul întoarce același text cu
două cuvinte schimbate și clientul își consumă degeaba variantele gratuite.

---

## Varianta gratuită

Gratuit se ascultă **melodia întreagă**, nu un minut din ea. Peste ea se aude o
semnătură sonoră, din douăzeci în douăzeci de secunde. Fișierele primite după
plată sunt curate.

Un minut convinge mai puțin decât toată piesa — dar o piesă întreagă și curată
n-ar mai avea de ce să fie cumpărată. Marca rezolvă amândouă: omul aude tot, dar
nu poate dărui ce a auzit.

Începutul rămâne curat până la prima marcă: primele secunde sunt cele care
conving, iar o bucată atât de scurtă nu e un cadou.

Cele trei manete stau în `.env` și se reglează cu urechea, nu din calcul:
`WATERMARK_FROM_SECONDS`, `WATERMARK_EVERY_SECONDS`, `WATERMARK_VOLUME`.

Aici e un compromis de care merită să fii conștient când le miști. Marca apără
produsul, dar ascultarea gratuită e tocmai lucrul care vinde: dacă acoperă prea
mult din melodie, omul nu mai apucă să se îndrăgostească de ea. Pârghia cea mai
bună nu e volumul, ci **durata fișierului mărcii** — o marcă de două secunde,
deasă și tare, protejează mai bine decât una de opt secunde, și nu strică
ascultarea.

```bash
npm run marca        # face o melodie falsă, pune marca, spune ce a ieșit
```

Filtrul ffmpeg e singura bucată din lanț care nu se poate verifica citind codul:
ori merge, ori dă o eroare lungă. Proba de mai sus o spune în cinci secunde, și
lasă fișierul pe disc, de ascultat. Dacă marca se aude prea tare sau prea încet,
se schimbă `WATERMARK_VOLUME` în `.env` — nu se calculează, se ascultă.

Sunetul stă în `marca/` pe server, montat în worker, NU în depozitul de cod: e
un fișier personal, iar depozitul e public. Dacă lipsește, se face automat
vechea previzualizare de `PREVIEW_SECONDS` — o marcă ștearsă din greșeală nu
oprește generarea, scade doar la ce era înainte. Cum se pune: `marca/CITESTE.md`.

---

## Pornire, local

```bash
cp .env.example .env      # completează cheile și APP_SECRET
npm install
npm run db:migrate
npm run dev               # web, pe :3000
npm run worker:dev        # coada, în alt terminal
```

`APP_SECRET` se generează o singură dată: `openssl rand -hex 32`.

---

## Limba site-ului

Site-ul e în română și engleză. Limba se alege pe server, în ordinea asta:

1. cookie-ul `lang`, pus de butonul din antet — alegerea omului bate tot;
2. `DEFAULT_LANG` din `.env` — pentru toți ceilalți.

`DEFAULT_LANG=ro` acum: clienții sunt majoritatea din Moldova și România. Pentru
engleză implicită se schimbă în `en` și se repornește; nimic altceva.

**`Accept-Language` nu se mai citește**, deși pare lucrul evident de făcut.
Minte exact în piața noastră: foarte mulți oameni din Moldova și din România au
telefonul în engleză dar vorbesc românește, iar ei primeau un site englezesc și
îl comutau de fiecare dată. Antetul spune ce limbă are aparatul, nu ce limbă
vorbește omul. Cine chiar vrea engleză o are la un buton distanță, iar alegerea
i se ține minte.

Se traduc doar etichetele văzute de om. Alegerile din formular — „Femeie",
„Altcineva", „Română", stările de spirit — rămân în română oriunde, pentru că
ele sunt protocolul: `validation.ts` le verifică drept enumerări exacte, iar
promptul lui Suno se construiește din ele. Vezi `src/lib/i18n.ts`.

## Panoul de comenzi

La **`/panou`**, cu parola din `PANEL_PASSWORD`. Arată toate comenzile, nu doar
cele plătite: unde se opresc oamenii spune mai mult despre ce merge prost decât
spun vânzările reușite.

O comandă deschisă arată tot ce se știe despre ea, în ordinea în care o cauți
când îți scrie un client: ce a cerut și povestea lui, toate variantele de
versuri, toate înregistrările — de ascultat pe loc, inclusiv cele integrale ale
comenzilor neplătite — plata, consimțămintele, emailurile plecate și urma
auditabilă.

Câteva decizii care nu sunt evidente:

**Nu e pe subdomeniu.** Un subdomeniu ar cere o înregistrare DNS, un bloc nou
în Caddy și un certificat, ca să rezolve o problemă pe care n-o avem: nu
separăm nimic. Pe aceeași adresă, cookie-ul de sesiune e deja pe domeniul
potrivit și nu se configurează nimic.

**Fără parolă în `.env`, panoul răspunde 404**, nu „parolă greșită". Un panou
care spune că e acolo e un panou pe care cineva începe să-l încerce.

**Paza stă în layout-ul grupului `(protejat)`**, nu în fiecare pagină. O pagină
nouă e apărată din clipa în care e creată — nu trebuie să-și amintească cineva
să pună o verificare în ea. Pagina de intrare stă dinadins în afara grupului;
sub aceeași pază, s-ar fi trimis la ea însăși la nesfârșit.

**Biletul e semnat, nu ținut în bază.** O sesiune în bază ar cere un tabel, o
migrare și o curățare, ca să rezolve o problemă pe care n-o avem: nu trebuie să
închidem sesiunea altcuiva. Schimbarea lui `APP_SECRET` le invalidează pe toate
deodată — ăsta e butonul de „scoate pe toată lumea afară".

**Linkurile de audio din panou poartă `panou=1`.** Parametrul nu e o cheie și
nu dă drepturi: doar cere verificarea. Dreptul vine din același bilet din
cookie. Cine pune parametrul fără să fie înăuntru primește același 402 ca
oricine — și există un test care ține asta în loc.

## Mini-CRM în Google Sheets

Două adrese care întorc CSV, protejate cu `EXPORT_KEY` din `.env`:

```
/api/export/comenzi.csv?key=…     ce s-a vândut
/api/export/incercari.csv?key=…   cine a încercat și ce a primit
```

În Sheets se leagă cu `=IMPORTDATA("…")`, care reîmprospătează singur.
`bash deploy/sheets.sh` afișează formulele gata de lipit. Cheia apare în adresa pusă în foaie,
deci e separată de tot restul și nu deschide nimic altceva.

## Reglarea sunetului

Toate tabelele care traduc alegerile clientului în limbaj Suno — stiluri,
direcții, stări, limbi, voce — stau într-un singur fișier:
`src/lib/pipeline/stiluri.ts`. Dacă un gen sună prost, acolo se schimbă un rând.

```bash
npm run stiluri
```

Arată, pentru fiecare stil, șirul exact care pleacă la Suno, și verifică
potrivirile: o stare oferită în formular dar netradusă ar dispărea în tăcere din
prompt, iar melodia ar ieși altfel decât a cerut omul.

Promptul care scrie versurile e separat, în `prompt.ts` (`SYSTEM_PROMPT`).

## Testare

```bash
npm run typecheck && npm run lint
CONFIRM_WIPE=1 DATABASE_URL=postgres://.../vocalmd_test npm run db:verify
BASE_URL=http://127.0.0.1:3000 DATABASE_NAME=vocalmd_e2e npm run test:e2e
```

`db:verify` ia la mână garanțiile schemei. `test:e2e` parcurge site-ul într-un
browser adevărat: formularul, crearea comenzii, trecerea la versuri, aprobarea,
ascultarea previzualizării, linkurile semnate și deblocarea după plată. Pașii
worker-ului sunt imitați scriind în bază, ca testul să meargă fără chei și fără
să consume credite.

Amândouă golesc tabele și refuză orice bază fără „test", „dev" sau „e2e" în nume.

## Pornire, pe server

Caddy rulează deja pe gazdă și termină HTTPS pentru vocal.md, deci web-ul ascultă
doar pe `127.0.0.1:3000`. Nimic din stivă nu e expus direct în internet.

Pașii întregi, cu ce se completează în `.env` și de unde se iau cheile, sunt în
**`deploy/PRIMA-INSTALARE.md`**. Pe scurt:

```bash
git clone <repo> /root/vocal-md && cd /root/vocal-md
bash deploy/setup.sh
docker compose logs -f worker
```

Serviciile: `db`, `migrate` (rulează o dată și iese), `web`, `worker`.
Web-ul și worker-ul pornesc doar după ce migrările au reușit.

Actualizările, după prima instalare: `./deploy/deploy.sh`.

Fragmentul de Caddy e în `deploy/Caddyfile`. Backup zilnic al bazei:

```
0 3 * * * /root/vocal-md/deploy/backup.sh >> /var/log/vocal-backup.log 2>&1
```

Fișierele audio stau pe volumul `audio`, nu în imagine, și se salvează separat.

---

## Când ceva nu merge

**`cod 429` de la Suno** — nu mai sunt credite.

**`cod 401`** — cheia e greșită sau are spații la copiere.

**`cod 413`** — versurile depășesc 5000 de caractere. Se scurtează din prompt.

**`SENSITIVE_WORD_ERROR`** — Suno a refuzat textul, de obicei din cauza unui nume
propriu. Comanda trece în `refused`, nu se reîncearcă, iar clientului i se explică.

**Un job rămas `running`** după o repornire bruscă se repune singur în coadă, la
pornirea worker-ului, dacă lacătul e mai vechi de 20 de minute.

**Comenzi blocate** — `select status, count(*) from orders group by 1;` arată unde
se strâng. `select * from jobs where status = 'failed' order by updated_at desc;`
arată de ce.

---

## Plata

Checkout-ul se creează pe server, nu în browser: prețul și identificatorul
Paddle a refuzat domeniul de cinci ori — motivul era în prima frază a politicii
lor: „Paddle is built to serve software companies", iar noi vindem fișiere
audio. Lemon Squeezy a refuzat și el, invocând regulile impuse lui de Stripe,
PayPal și companiile de carduri. Problema e categoria, nu site-ul.

Până se leagă Paynet, se încasează pe un **link fix de plată MAIB**, iar
deblocarea o face omul, cu mâna, de pe Telegram. Tot ce ține de procesator stă
într-un singur fișier, `src/lib/plata.ts`: a treia mutare înseamnă rescris
fișierul ăla, nu căutat prin proiect.

Fluxul are trei timpi:

```
clientul deschide linkul   →  notificare pe Telegram
clientul zice „am plătit"  →  payment_claimed + notificare cu două butoane
apeși „Deblochează"        →  paid, livrarea intră în coadă, emailul pleacă
```

Ce nu poate linkul fix, și trebuie știut: **nu poartă identificatorul comenzii.**
MAIB spune că au intrat 30 €, nu de la care comandă. Puntea e adresa de email,
pe care clientul o completează și la noi, și la MAIB — de asta i-o punem sub
ochi pe ecranul de plată și o repetăm în mesajul de pe Telegram.

Starea `payment_claimed` e cea în care clientul **spune** că a plătit. Melodia
rămâne închisă: browserul poate minți, iar singura dovadă e contul. Testul e2e
ține cel mai mult la exact asta.

Webhook-ul Telegram (`/api/webhooks/telegram`) e cea mai periculoasă adresă din
proiect — cine o poate chema poate debloca melodii pe gratis. De asta verifică
întâi antetul secret, cu `timingSafeEqual`, și abia apoi citește ceva din corp.
Peste el, apăsarea trebuie să vină din chat-ul nostru, iar `update_id` ține
idempotența: Telegram retrimite până primește 200.

Butonul „Respinge" acoperă și rambursarea: comanda se întoarce la previzualizare,
păstrează previzualizările, pierde fișierele integrale. Ruta de audio verifică
starea la fiecare cerere, deci accesul se închide imediat. Banii se dau înapoi
din MAIB, cu mâna.

## Ce urmează

1. **Pagina publică de dăruit** — un link cu piesa și versurile, de trimis mai
   departe. A fost scoasă din ecranul de livrare până există o pagină care arată
   o comandă fără să deschidă și restul.
2. **Emailurile în engleză** — pagina e bilingvă, dar mesajele de livrare pleacă
   doar în română.
