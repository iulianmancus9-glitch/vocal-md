#!/usr/bin/env bash
# Backup zilnic al bazei. Pune-l în cron:
#   0 3 * * * /root/vocal-md/deploy/backup.sh >> /var/log/vocal-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
STAMP=$(date +%F)
OUT="deploy/backup/vocalmd-$STAMP.sql.gz"

mkdir -p deploy/backup
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-vocal}" "${POSTGRES_DB:-vocalmd}" \
  | gzip > "$OUT"

# Păstrăm 14 zile. Fișierele audio stau pe volum și se salvează separat.
find deploy/backup -name 'vocalmd-*.sql.gz' -mtime +14 -delete
echo "$(date -Is) backup scris în $OUT ($(du -h "$OUT" | cut -f1))"
