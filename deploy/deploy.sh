#!/usr/bin/env bash
# Actualizarea site-ului pe server. Rulează din rădăcina proiectului:
#
#   ./deploy/deploy.sh
#
# Ce face: aduce codul, reconstruiește imaginea, aplică migrările, repornește.
# Worker-ul primește timp să termine jobul curent, ca o generare în curs să nu
# fie retezată la mijloc.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Lipsește .env. Copiază .env.example și completează-l." >&2
  exit 1
fi

echo "→ Aduc ultima versiune a codului"
git pull --ff-only

echo "→ Construiesc imaginea"
docker compose build

echo "→ Aplic migrările"
docker compose run --rm migrate

echo "→ Repornesc serviciile"
docker compose up -d

echo "→ Aștept ca web-ul să răspundă"
for i in $(seq 1 30); do
  if curl -fsS -m 3 http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "   sănătos după ${i}s"
    docker compose ps
    exit 0
  fi
  sleep 1
done

echo "Web-ul nu a răspuns în 30 de secunde. Jurnalul:" >&2
docker compose logs --tail 40 web >&2
exit 1
