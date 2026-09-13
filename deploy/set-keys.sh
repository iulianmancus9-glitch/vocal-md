#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  Pune chei în .env fără editor de text.
#
#    bash deploy/set-keys.sh                 → grupul Paddle + Resend
#    bash deploy/set-keys.sh RESEND_API_KEY  → doar una anume
#
#  Fiecare cheie se cere pe rând. Apeși Enter fără să scrii nimic și cheia
#  rămâne cum era — util când vrei să schimbi doar una.
# ══════════════════════════════════════════════════════════════
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .env ] || { echo "Nu găsesc .env. Rulează întâi deploy/setup.sh." >&2; exit 1; }

DEFAULT_KEYS=(
  PADDLE_ENV
  PADDLE_API_KEY
  PADDLE_CLIENT_TOKEN
  PADDLE_PRICE_ID
  PADDLE_WEBHOOK_SECRET
  RESEND_API_KEY
  MAIL_FROM
)

declare -A HINT=(
  [PADDLE_ENV]="sandbox sau production"
  [PADDLE_API_KEY]="Paddle → Developer tools → Authentication → API keys"
  [PADDLE_CLIENT_TOKEN]="Paddle → Developer tools → Authentication → Client-side tokens"
  [PADDLE_PRICE_ID]="începe cu pri_ ; îl iei de la prețul din Catalog"
  [PADDLE_WEBHOOK_SECRET]="Paddle → Developer tools → Notifications → destinația ta"
  [RESEND_API_KEY]="Resend → API Keys ; începe cu re_"
  [MAIL_FROM]="de pe ce adresă pleacă emailurile, ex: Vocal MD <comenzi@vocal.md>"
)

KEYS=("$@")
[ ${#KEYS[@]} -eq 0 ] && KEYS=("${DEFAULT_KEYS[@]}")

current() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }

# Arată doar începutul și sfârșitul: destul ca să recunoști cheia, nu destul
# ca să rămână întreagă pe ecran sau în istoricul terminalului.
mask() {
  local v="$1"
  [ -z "$v" ] && { echo "(gol)"; return; }
  [ ${#v} -le 12 ] && { echo "***"; return; }
  echo "${v:0:6}…${v: -4}"
}

set_var() {
  local key="$1" value="$2"
  local escaped=${value//|/\\|}
  if grep -qE "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${escaped}|" .env
  else
    printf '%s=%s\n' "$key" "$escaped" >> .env
  fi
}

echo
echo "Completează doar ce vrei să schimbi. Enter gol = lași cum e."
echo

changed=0
for key in "${KEYS[@]}"; do
  now=$(current "$key" || true)
  echo "  ${HINT[$key]:-}"
  read -r -p "  $key [$(mask "$now")]: " value
  if [ -n "$value" ]; then
    set_var "$key" "$value"
    changed=$((changed + 1))
  fi
  echo
done

chmod 600 .env

if [ "$changed" -eq 0 ]; then
  echo "Nu s-a schimbat nimic."
  exit 0
fi

if [ "$changed" -eq 1 ]; then echo "Am schimbat o cheie. Acum arată așa:"; else echo "Am schimbat $changed chei. Acum arată așa:"; fi
echo
for key in "${KEYS[@]}"; do
  printf '  %-24s %s\n' "$key" "$(mask "$(current "$key" || true)")"
done
echo
read -r -p "Repornesc site-ul ca să le folosească? [D/n] " restart
case "${restart:-D}" in
  [nN]*) echo "Bine. Când vrei:  docker compose up -d" ;;
  *)
    docker compose up -d
    echo
    for i in $(seq 1 40); do
      if curl -fsS -m 3 http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
        echo "✓ Site-ul răspunde, cu cheile noi."
        exit 0
      fi
      sleep 1
    done
    echo "Site-ul nu răspunde. Vezi:  docker compose logs --tail 40 web" >&2
    exit 1
    ;;
esac
