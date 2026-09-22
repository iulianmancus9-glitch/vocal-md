#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  Afișează formulele de lipit în Google Sheets.
#
#    bash deploy/sheets.sh
#
#  `setup.sh` le arată o dată, la prima instalare. Scriptul ăsta le arată
#  oricând, fără să reinstaleze nimic.
#
#  Cheia apare în adresa pusă în foaie, deci e o cheie separată de tot restul:
#  nu deschide nimic altceva și se poate schimba din .env fără să afecteze
#  site-ul. Nu pune foaia „la vedere pentru oricine are linkul" — cheia s-ar
#  vedea odată cu ea.
# ══════════════════════════════════════════════════════════════
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .env ] || { echo "Nu găsesc .env. Rulează întâi deploy/setup.sh." >&2; exit 1; }

# `|| true` nu e de decor. Cu `set -euo pipefail`, un grep care nu găsește rândul
# întoarce 1, `pipefail` duce eșecul mai departe, iar `set -e` oprește scriptul pe
# loc — fără să scrie nimic. O cheie care lipsește cu totul din .env omora astfel
# scriptul în tăcere, iar pe ecran arăta exact ca și cum nu l-ai fi rulat.
get() { grep -E "^$1=" .env | head -1 | cut -d= -f2- || true; }

set_var() {
  local key="$1" value="$2"
  if grep -qE "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

KEY="$(get EXPORT_KEY)"
SITE="$(get APP_URL)"
SITE="${SITE%/}"

[ -z "$SITE" ] && { echo "Lipsește APP_URL din .env." >&2; exit 1; }

# Cheia se generează singură, prima dată.
#
# `setup.sh` o face la instalare, dar un .env mai vechi decât funcția asta nu o
# are — și atunci scriptul se oprea cu o eroare pe care n-avea cum s-o rezolve
# cineva care nu știe ce e o cheie de export.
if [ -z "$KEY" ]; then
  echo
  echo "  Nu aveai încă o cheie de export. Am generat una acum."
  KEY=$(openssl rand -hex 20)
  set_var EXPORT_KEY "$KEY"
  chmod 600 .env
  echo "  Repornesc site-ul ca s-o folosească…"
  echo
  docker compose up -d >/dev/null 2>&1 || docker compose up -d
  for _ in $(seq 1 40); do
    curl -fsS -m 3 http://127.0.0.1:3000/api/health >/dev/null 2>&1 && break
    sleep 2
  done
  echo "  ✓ Gata."
fi

cat <<EOF

  Deschide sheets.new și fă două foi, cu numele „Vândute" și „Toate".

  În foaia „Vândute", în celula A1, lipește:

    =IMPORTDATA("${SITE}/api/export/comenzi.csv?key=${KEY}")

  În foaia „Toate", în celula A1, lipește:

    =IMPORTDATA("${SITE}/api/export/incercari.csv?key=${KEY}")

  Atât. Google reîmprospătează singur, cam o dată pe oră. Ca să vezi pe loc
  ce s-a schimbat, șterge celula și lipește formula din nou.

  „Vândute" arată doar comenzile plătite, cu suma și tranzacția.
  „Toate" arată fiecare încercare: unde a ajuns omul, ce a cerut și povestea
  lui — cel mai util lucru de citit când vrei să înțelegi de ce o melodie a
  ieșit bine sau prost.

EOF
