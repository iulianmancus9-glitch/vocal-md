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
Premier, cu drepturi comerciale). Versurile și melodia întreagă (cu o semnătură
sonoră peste ea) se ascultă gratuit; fișierele curate costă 30 €, plată unică,
și se livrează ca două fișiere MP3.

Detaliile tehnice sunt în `README.md`. Citește-l înainte să schimbi ceva.

## Starea, la zi

Site-ul e gata și funcționează: bilingv română/engleză, pagina de start arată
prețul, cum funcționează și întrebări frecvente. Formularul merge cap-coadă,
generarea merge, livrarea prin linkuri semnate merge.

**Se poate vinde.** Plata se face pe un link fix MAIB, iar deblocarea o face el,
cu mâna, de pe Telegram. E soluția de probă: dacă vin 2-3 comenzi, se conectează
Paynet.

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

## Cum se încasează acum

Link fix de plată MAIB, `MAIB_PAY_URL` în `.env`. Tot ce ține de procesator stă
într-un singur fișier: `src/lib/plata.ts`. Când vine Paynet, se rescrie ăla.

Fluxul, în trei timpi:

1. clientul deschide linkul → notificare pe Telegram;
2. clientul apasă „Am efectuat achitarea" → starea `payment_claimed`, plus o
   notificare cu două butoane: ✅ Deblochează / ❌ Respinge;
3. el apasă ✅ → `paid`, livrarea intră în coadă, emailul pleacă singur.

**Linkul MAIB nu poartă identificatorul comenzii.** Banca spune că au intrat
30 €, nu de la care comandă. Puntea e adresa de email, pe care clientul o pune
și la noi, și la MAIB. De asta i se arată pe ecranul de plată și se repetă în
mesajul de pe Telegram. Nu strica asta.

Butonul „Respinge" acoperă și rambursarea: pe o comandă deja plătită închide
accesul la loc. Banii se dau înapoi din MAIB, cu mâna.

`/api/webhooks/telegram` e cea mai periculoasă adresă din proiect. Verifică
antetul secret înainte să citească orice, cere ca apăsarea să vină din chat-ul
lui și ține idempotența pe `update_id`.

## Ce urmează

**Paynet**, procesator din Moldova, cere 2000 de lei la conectare. De asta merge
întâi pe MAIB, cu mâna: dacă se strâng 2-3 comenzi adevărate, investiția are
sens. Cererea la Paynet e trimisă; se așteaptă răspuns dacă acceptă categoria
(fișiere audio generate cu AI) și cardurile emise în România și în UE.

Când se leagă Paynet, de făcut:

1. Rescris `src/lib/plata.ts` pentru API-ul lor. Ruta de checkout întoarce deja
   un obiect, nu un șir, tocmai ca să nu se schimbe când adresa devine una
   generată pentru fiecare comandă. Cod Paddle, ca exemplu de structură cu
   webhook semnat, există în istoric la `305b617^`.
2. Paynet are notificare automată; pe ea se deblochează melodia singură, iar
   `payment_claimed` devine o stare de rezervă, nu drumul normal.
3. **Documentele legale** de verificat din nou — acum spun că vânzătorul e firma
   lui, iar plata o procesează MAIB. **Partea de TVA n-a fost scrisă de tine și
   nu o scrie:** el o verifică cu contabilul. Tu nu ești consilier fiscal.

## Panoul de comenzi

La `/panou`, cu parola din `PANEL_PASSWORD`. Toate comenzile, nu doar cele
plătite; o comandă deschisă arată tot — formular, poveste, toate variantele de
versuri, toate înregistrările de ascultat, plata, emailurile, urma auditabilă.

Nu e pe subdomeniu, dinadins: n-ar rezolva nimic și ar cere DNS, Caddy și
certificat. Paza stă în layout-ul grupului `(protejat)`, deci o pagină nouă e
apărată din clipa în care e creată. Pagina de intrare stă în afara grupului,
altfel s-ar trimite la ea însăși la nesfârșit.

Fără parolă în `.env`, panoul răspunde 404, nu „parolă greșită".

## Ce a mai rămas nefăcut

- emailurile către clienți sunt doar în română, deși site-ul e bilingv
- nu există pagina publică de dăruit (un link cu melodia și versurile, de trimis)
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
