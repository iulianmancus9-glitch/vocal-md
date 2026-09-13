# Prima instalare pe VPS

Pentru serverul Ubuntu 24.04 de la 194.33.42.212, unde Caddy rulează deja și
domeniul vocal.md are HTTPS prin Cloudflare.

---

## 1. Docker, dacă nu e deja

```bash
curl -fsSL https://get.docker.com | sh
docker compose version
```

## 2. Codul

Depozitul e public, deci nu ai nevoie de parolă, iar ramura noastră e cea
principală, deci nu trebuie ales nimic:

```bash
cd /root
git clone https://github.com/iulianmancus9-glitch/vocal-md.git
cd vocal-md
```

## 3. Configurarea, automat

```bash
cd /root/vocal-md
bash deploy/setup.sh
```

Primul rând te duce în folderul potrivit indiferent unde te afli — dacă te-ai
deconectat între timp, sesiunea nouă pornește din altă parte și `./deploy/setup.sh`
ar da „no such file or directory".

Scriptul îți cere cele două chei API (sau le găsește singur, dacă ai testat
pipeline-ul pe acest server), inventează parolele care trebuie inventate,
scrie `.env` și pornește totul.

Restul secțiunii de mai jos e doar pentru cine vrea s-o facă de mână.

## 3b. Configurarea, de mână

```bash
cp .env.example .env
nano .env
```

De completat obligatoriu:

| Cheie | De unde |
|---|---|
| `APP_SECRET` | generează-l: `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | inventează una lungă; pune-o și în `DATABASE_URL` |
| `DATABASE_URL` | `postgres://vocal:PAROLA@db:5432/vocalmd` — hostul e `db`, numele serviciului |
| `OPENROUTER_API_KEY` | openrouter.ai → Keys |
| `SUNO_API_KEY` | sunoapi.org → contul tău |
| `APP_URL` | `https://vocal.md` |

Paddle și Resend rămân goale deocamdată — site-ul pornește fără ele. Butonul de
cumpărare spune că plata se activează în curând, în loc să livreze degeaba.

## 4. Pornirea

Dacă ai folosit `setup.sh`, e deja pornit. Altfel:

```bash
docker compose up -d --build
docker compose ps
curl -s http://127.0.0.1:3000/api/health
```

Trebuie să răspundă `{"ok":true,"db":"up"}`.

## 5. Caddy

Adaugă în `/etc/caddy/Caddyfile` blocul din `deploy/Caddyfile`, apoi:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Dacă în Cloudflare ai modul SSL „Flexible", treci-l pe **Full (strict)** —
altfel Cloudflare vorbește cu serverul pe HTTP și Caddy nu are ce termina.

## 6. Backup zilnic

```bash
crontab -e
```

```
0 3 * * * /root/vocal-md/deploy/backup.sh >> /var/log/vocal-backup.log 2>&1
```

Fișierele audio stau pe volumul Docker `vocal-md_audio` și se salvează separat.

---

## Prima comandă adevărată

Intră pe https://vocal.md, completează formularul și urmărește din alt terminal:

```bash
docker compose logs -f worker
```

Trebuie să vezi, pe rând:

```
▸ lyrics <id> (încercarea 1)
✓ lyrics în 20s
▸ render <id> (încercarea 1)
✓ render în 140s
```

Dacă versurile nu vin, verifică cheia OpenRouter. Dacă melodia nu vine, verifică
creditele Suno.

---

## Actualizări, după prima instalare

```bash
cd /root/vocal-md && ./deploy/deploy.sh
```
