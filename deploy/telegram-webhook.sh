#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  Îi spune lui Telegram unde să trimită apăsările de buton.
#
#    bash deploy/telegram-webhook.sh          → înregistrează webhook-ul
#    bash deploy/telegram-webhook.sh status   → arată ce crede Telegram acum
#    bash deploy/telegram-webhook.sh sterge   → îl scoate
#
#  Se rulează o singură dată, după ce cheile sunt puse în .env cu set-keys.sh.
#  Trebuie rulat din nou doar dacă se schimbă domeniul, tokenul sau secretul.
#
#  Telegram cere HTTPS cu certificat valid — îl avem, prin Caddy. De asta
#  webhook-ul merge doar pe domeniul adevărat, nu pe localhost.
# ══════════════════════════════════════════════════════════════
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .env ] || { echo "Nu găsesc .env. Rulează întâi deploy/setup.sh." >&2; exit 1; }

# `|| true` nu e de decor. Cu `set -euo pipefail`, un grep care nu găsește rândul
# întoarce 1, `pipefail` duce eșecul mai departe, iar `set -e` oprește scriptul pe
# loc — fără să scrie nimic. Aici cheile există, pentru că le pune `set-keys.sh`,
# deci nu s-a văzut niciodată — dar e aceeași capcană.
get() { grep -E "^$1=" .env | head -1 | cut -d= -f2- || true; }

TOKEN="$(get TELEGRAM_BOT_TOKEN)"
SECRET="$(get TELEGRAM_WEBHOOK_SECRET)"
APP_URL="$(get APP_URL)"
CHAT_ID="$(get TELEGRAM_CHAT_ID)"

missing=""
[ -z "$TOKEN" ]  && missing="$missing TELEGRAM_BOT_TOKEN"
[ -z "$SECRET" ] && missing="$missing TELEGRAM_WEBHOOK_SECRET"
[ -z "$CHAT_ID" ] && missing="$missing TELEGRAM_CHAT_ID"
[ -z "$APP_URL" ] && missing="$missing APP_URL"
if [ -n "$missing" ]; then
  echo "Lipsesc din .env:$missing" >&2
  echo "Pune-le cu: bash deploy/set-keys.sh" >&2
  exit 1
fi

API="https://api.telegram.org/bot${TOKEN}"
HOOK="${APP_URL%/}/api/webhooks/telegram"

case "${1:-pune}" in
  status)
    echo "Ce știe Telegram acum:"
    curl -sS "${API}/getWebhookInfo"
    echo
    ;;

  sterge)
    echo "Scot webhook-ul…"
    curl -sS "${API}/deleteWebhook"
    echo
    ;;

  pune)
    echo "Înregistrez: $HOOK"
    # Cerem doar ce folosim: apăsările de buton și mesajele scrise în chat
    # (pentru `/limite`). Fără `allowed_updates`, Telegram ne-ar trimite tot.
    curl -sS -X POST "${API}/setWebhook" \
      -H 'Content-Type: application/json' \
      -d "$(printf '{"url":"%s","secret_token":"%s","allowed_updates":["callback_query","message"],"drop_pending_updates":true}' \
            "$HOOK" "$SECRET")"
    echo
    echo
    echo "Trimit un mesaj de probă…"
    curl -sS -X POST "${API}/sendMessage" \
      -H 'Content-Type: application/json' \
      -d "$(printf '{"chat_id":"%s","text":"Vocal MD e legat. De aici vin comenzile."}' "$CHAT_ID")"
    echo
    echo
    echo "Dacă ai primit mesajul pe Telegram, e gata."
    echo "Dacă nu: scrie-i întâi botului tău /start, apoi rulează iar scriptul."
    ;;

  *)
    echo "Nu știu „$1\". Folosește: pune | status | sterge" >&2
    exit 1
    ;;
esac
