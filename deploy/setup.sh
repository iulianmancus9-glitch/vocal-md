#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  VOCAL MD — instalarea pe server, dintr-o singură comandă.
#
#    cd /root/vocal-md && ./deploy/setup.sh
#
#  Ce face: îți cere cele două chei API, inventează singur parolele care
#  trebuie inventate, scrie .env, pornește totul și verifică că răspunde.
#  Nu suprascrie un .env existent fără să întrebe.
# ══════════════════════════════════════════════════════════════
set -euo pipefail

cd "$(dirname "$0")/.."

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
good() { printf '\033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '\033[33m!\033[0m %s\n' "$1"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

echo
bold "VOCAL MD — instalare"
echo

# ─── 1. uneltele ───────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || die \
  "Docker nu e instalat. Rulează întâi:  curl -fsSL https://get.docker.com | sh"
docker compose version >/dev/null 2>&1 || die \
  "Lipsește 'docker compose'. Reinstalează Docker cu:  curl -fsSL https://get.docker.com | sh"
good "Docker e instalat"

# ─── 2. .env existent ──────────────────────────────────────────
if [ -f .env ]; then
  warn "Există deja un fișier .env."
  read -r -p "  Îl păstrez și trec direct la pornire? [D/n] " keep
  case "${keep:-D}" in
    [nN]*) mv .env ".env.vechi-$(date +%Y%m%d-%H%M%S)"
           good "Am pus vechiul .env deoparte" ;;
    *)     good "Păstrez .env-ul existent"; SKIP_ENV=1 ;;
  esac
fi

if [ -z "${SKIP_ENV:-}" ]; then
  # ─── 3. cheile ───────────────────────────────────────────────
  OPENROUTER=""
  SUNO=""

  # Dacă ai testat pipeline-ul pe acest server, cheile sunt deja acolo.
  for old in /root/vocal-pipeline/.env ../vocal-pipeline/.env; do
    if [ -f "$old" ]; then
      OPENROUTER=$(grep -E '^OPENROUTER_API_KEY=' "$old" | cut -d= -f2- | tr -d '"'"'"' ' || true)
      SUNO=$(grep -E '^SUNO_API_KEY=' "$old" | cut -d= -f2- | tr -d '"'"'"' ' || true)
      [ -n "$OPENROUTER" ] && good "Am găsit cheile în $old"
      break
    fi
  done

  if [ -z "$OPENROUTER" ] || [ "$OPENROUTER" = "pune-cheia-aici" ]; then
    echo
    echo "Cheia OpenRouter (o iei de pe openrouter.ai → Keys)."
    read -r -p "  OPENROUTER_API_KEY: " OPENROUTER
  fi
  if [ -z "$SUNO" ] || [ "$SUNO" = "pune-cheia-aici" ]; then
    echo
    echo "Cheia Suno (o iei din contul tău de pe sunoapi.org)."
    read -r -p "  SUNO_API_KEY: " SUNO
  fi

  [ -n "$OPENROUTER" ] || die "Fără cheia OpenRouter nu se pot scrie versurile."
  [ -n "$SUNO" ] || die "Fără cheia Suno nu se poate face melodia."

  # ─── 4. secretele pe care le inventăm noi ────────────────────
  APP_SECRET=$(openssl rand -hex 32)
  DB_PASS=$(openssl rand -hex 16)
  EXPORT_KEY=$(openssl rand -hex 20)

  read -r -p "
Adresa site-ului [https://golura.io]: " APP_URL
  APP_URL=${APP_URL:-https://golura.io}

  # ─── 5. scrierea .env ────────────────────────────────────────
  cp .env.example .env
  set_var() {
    # valorile pot conține / și &, deci separatorul lui sed e |
    local key="$1" value="$2"
    local escaped=${value//|/\\|}
    sed -i "s|^${key}=.*|${key}=${escaped}|" .env
  }

  set_var APP_URL "$APP_URL"
  set_var APP_SECRET "$APP_SECRET"
  set_var POSTGRES_PASSWORD "$DB_PASS"
  set_var DATABASE_URL "postgres://vocal:${DB_PASS}@db:5432/vocalmd"
  set_var OPENROUTER_API_KEY "$OPENROUTER"
  set_var SUNO_API_KEY "$SUNO"
  set_var SUNO_CALLBACK_URL "${APP_URL}/api/suno/callback"
  set_var EXPORT_KEY "$EXPORT_KEY"

  chmod 600 .env
  good ".env scris (parolele generate automat, nu trebuie să le știi pe de rost)"
fi

# ─── 6. pornirea ───────────────────────────────────────────────
echo
bold "Construiesc și pornesc. Prima dată durează câteva minute."
docker compose up -d --build

echo
printf 'Aștept ca site-ul să răspundă'
for i in $(seq 1 60); do
  if curl -fsS -m 3 http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo
    good "Site-ul răspunde, după ${i}s"
    echo
    docker compose ps
    echo
    KEY=$(grep -E '^EXPORT_KEY=' .env | cut -d= -f2-)
    SITE=$(grep -E '^APP_URL=' .env | cut -d= -f2-)

    bold "Mai rămâne un singur pas: Caddy."
    echo
    echo "  Dacă Caddy rulează în container (verifici cu: docker ps | grep caddy),"
    echo "  configurarea lui e montată din afară — de obicei /srv/Caddyfile — iar"
    echo "  adresa site-ului trebuie dată pe nume de container, nu 127.0.0.1:"
    echo
    echo "      reverse_proxy vocal-md-web-1:3000"
    echo
    echo "  și cele două containere trebuie puse în aceeași rețea:"
    echo
    echo "      docker network connect vocal-md_default NUMELE_CONTAINERULUI_CADDY"
    echo
    echo "  Dacă Caddy e instalat pe server, editezi /etc/caddy/Caddyfile și"
    echo "  folosești reverse_proxy 127.0.0.1:3000. Blocul complet, în ambele"
    echo "  variante, e în deploy/Caddyfile."
    echo
    bold "Pentru foaia ta de calcul"
    echo
    echo "  În Google Sheets, celula A1 din fiecare filă:"
    echo
    echo "    Comenzi platite:"
    printf '    =IMPORTDATA("%s/api/export/comenzi.csv?key=%s")\n' "$SITE" "$KEY"
    echo
    echo "    Toate incercarile:"
    printf '    =IMPORTDATA("%s/api/export/incercari.csv?key=%s")\n' "$SITE" "$KEY"
    echo
    bold "Prima melodie"
    echo
    echo "  Intră pe $SITE și comandă. Ca să vezi ce se întâmplă în spate:"
    echo
    echo "      cd /root/vocal-md && docker compose logs -f worker"
    echo
    exit 0
  fi
  printf '.'
  sleep 1
done

echo
die "Site-ul nu a răspuns în 60 de secunde. Vezi ce zice:  docker compose logs --tail 50 web"
