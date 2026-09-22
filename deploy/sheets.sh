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

get() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }

KEY="$(get EXPORT_KEY)"
SITE="$(get APP_URL)"
SITE="${SITE%/}"

[ -z "$KEY" ] && { echo "Lipsește EXPORT_KEY din .env." >&2; exit 1; }
[ -z "$SITE" ] && { echo "Lipsește APP_URL din .env." >&2; exit 1; }

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
