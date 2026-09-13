# VOCAL MD

Site unde oamenii comandă melodii personalizate. Formular în șase pași, versuri
gratuite scrise de Gemini, previzualizare gratuită de 60 de secunde în două
interpretări, apoi 30 € pentru melodia completă, prin Paddle.

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
         ├── order_tracks      cele două variante cântate, plus previzualizările
         ├── payments          tranzacția Paddle
         ├── emails            ce i-am trimis clientului și dacă a plecat
         └── order_events      urma auditabilă: ce s-a întâmplat și când

jobs             coada worker-ului
webhook_events   idempotență pentru Paddle și Suno
rate_limits      apărarea previzualizării gratuite
```

Drumul normal al unei comenzi, prin coloana `status`:

```
draft → lyrics_pending → lyrics_ready → rendering → preview_ready → paid → delivered
```

Ramurile scurte: `refused` (filtru de conținut), `failed` (eroare tehnică),
`expired` (retenție).

Patru decizii care nu sunt evidente din schemă:

**Banii nu se pot cheltui de două ori.** O previzualizare e gratuită pentru client,
dar fiecare apăsare consumă credite Suno plătite de noi. Indexul parțial
`jobs_active_key` face ca aceeași comandă să nu poată avea două joburi de același tip
în lucru, deci un dublu-click nu produce două generări. Peste el, `rate_limits`
limitează pe IP și pe email.

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

## Ce urmează

1. **Paddle** — checkout, webhook cu verificare de semnătură, trecerea în `paid`.
   Până atunci, butonul de cumpărare spune că plata se activează în curând.
2. **Emailul de livrare** și jobul `deliver` — singurul handler de coadă nescris.
3. **Pagina publică de dăruit** — un link cu piesa și versurile, de trimis mai
   departe. A fost scoasă din ecranul de livrare până există o pagină care arată
   o comandă fără să deschidă și restul.
