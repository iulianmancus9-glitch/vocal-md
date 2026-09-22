# Context pentru asistent

Fișierul ăsta se citește singur la începutul fiecărei sesiuni. Citește-l întâi.

## Cu cine vorbești

Iulian, din Moldova. Nu se pricepe la programare. Vorbiți **în română**. Explică
simplu, pas cu pas, și dă comenzile gata de copiat, câte una pe rând.

**Nu-i cere niciodată chei API în chat.** Le pune singur pe server, cu
`bash deploy/set-keys.sh`.

**Nu ai acces la serverul lui.** Tot ce ține de server îl rulează el și îți
lipește rezultatul. Nu-i spune că „verifici tu" ceva ce nu poți verifica.

Firma: WADE PRODUCTION S.R.L., IDNO 1025600056881.

## Ce e proiectul

vocal.md — vinde melodii personalizate. Clientul completează un formular în șase
pași, versurile le scrie Gemini (prin OpenRouter), melodia o cântă Suno (plan
Premier, cu drepturi comerciale). Versurile și un minut din melodie sunt
gratuite; melodia întreagă costă 30 €, plată unică, și se livrează ca două
fișiere MP3.

Detaliile tehnice sunt în `README.md`. Citește-l înainte să schimbi ceva.

## Starea, la zi

Site-ul e gata și funcționează: bilingv română/engleză, pagina de start arată
prețul, trei melodii de ascultat, cum funcționează și întrebări frecvente.
Formularul merge cap-coadă, generarea merge, livrarea prin linkuri semnate merge.

**Ce lipsește ca să se poată vinde: un procesator de plăți care să-l accepte.**

## Povestea plăților — citește, ca să nu se repete

Doi procesatori internaționali l-au refuzat:

- **Paddle**, de cinci ori, mereu cu același text generic. Politica lor începe cu
  „Paddle is built to serve software companies"; aici se vând fișiere audio.
  S-au încercat, degeaba: melodii demo pe prima pagină, traducerea site-ului în
  engleză, prețul la vedere, meniu, FAQ.
- **Lemon Squeezy**, după ce a cerut lămuriri și le-a primit. Motivul dat:
  regulile impuse lor de Stripe, PayPal și companiile de carduri.

Concluzia, plătită cu două săptămâni: **problema e categoria, nu site-ul.**

**Nu propune Paddle, Lemon Squeezy, Polar, Creem sau Dodo.** Stau toate pe
aceleași șine și răspund la fel.

Regula care iese din asta, și care se aplică la orice de acum înainte: **dacă o
soluție depinde de aprobarea cuiva, se întreabă întâi dacă acceptă categoria, și
abia apoi se construiește.**

## Ce urmează

**Paynet**, procesator din Moldova. Clienții sunt majoritatea din Moldova și
România, iar Paynet evaluează local, nu prin filtrul Stripe sau Visa. Cererea e
trimisă; se așteaptă răspuns la două întrebări: dacă acceptă categoria (fișiere
audio generate cu AI) și dacă acceptă carduri emise în România și în UE.

Când răspund, de făcut:

1. Legat Paynet în site. A rămas cod pentru Lemon Squeezy, care nu mai trebuie:
   `src/lib/lemon.ts`, `src/lib/lemon-client.js`,
   `src/app/api/webhooks/lemon/route.ts`. Planul era ca procesatorul să fie
   comutabil dintr-un rând din `.env`, ca a treia mutare să nu mai însemne o
   rescriere. Cod Paddle, ca exemplu de structură, există în istoric la `305b617^`.
2. Paynet are notificare automată către site; pe ea se deblochează melodia.
3. **Documentele legale** (`content/legal/documente-legale.md`) spun acum că
   vânzătorul e Lemon Squeezy. Cu Paynet vânzătorul e firma lui, deci textele se
   rescriu, inclusiv partea de TVA. **Întreabă-l înainte** — vrea să verifice cu
   contabilul, iar tu nu ești consilier fiscal.

## Ce a mai rămas nefăcut

- emailurile către clienți sunt doar în română, deși site-ul e bilingv
- nu există pagina publică de dăruit (un link cu melodia și versurile, de trimis)
- Google Sheets nu e legat (rutele care dau CSV există, protejate cu o cheie)
- nu e pus backup automat la baza de date
- Resend nu e verificat pe domeniu

## Înainte să dai ceva drept gata

```bash
npm run lint && npx tsc --noEmit
npm run test:e2e      # 89 de verificări, cere o bază Postgres de test
npm run db:verify     # 33 de verificări ale schemei
npm run check:docker  # build-ul trece fără variabile de mediu
npm run stiluri       # ce prompt pleacă la Suno, pe stiluri
```

Toate treceau la ultimul commit. Dacă una pică după o schimbare de-a ta, e a ta.

## Un fir lăsat deschis

În `src/lib/pipeline/stiluri.ts` stau toate stilurile într-un tabel. Cele 47 de
sub-stiluri pleacă la Suno **în română** („baladă acustică", „sârbă de joc"),
deși Suno înțelege mai bine engleza. Traducerile sunt scrise deja, în
`SUB_STILURI`, dar nefolosite, cu instrucțiunea de comutare deasupra. Nu s-au
activat pentru că schimbă sunetul tuturor melodiilor deodată — se decide după ce
se ascultă, nu din presupunere.
