#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  Afișează Store ID și Variant ID din contul Lemon Squeezy.
#
#    bash deploy/lemon-ids.sh
#
#  Identificatorii nu se văd bine în dashboard, iar cel al variantei se confundă
#  ușor cu al produsului — de aceea le citim direct de la ei, nu din ochi.
#
#  Cheia nu se scrie pe ecran și nu se salvează nicăieri.
# ══════════════════════════════════════════════════════════════
set -euo pipefail

command -v python3 >/dev/null || { echo "Lipsește python3." >&2; exit 1; }

KEY="${1:-}"
if [ -z "$KEY" ]; then
  read -rsp "Cheia API de la Lemon Squeezy (nu se vede ce scrii): " KEY
  echo
fi
[ -n "$KEY" ] || { echo "Fără cheie nu pot întreba nimic." >&2; exit 1; }

ask() {
  curl -fsS "https://api.lemonsqueezy.com/v1/$1" \
    -H "Accept: application/vnd.api+json" \
    -H "Authorization: Bearer $KEY"
}

echo
echo "── Magazine ──────────────────────────────────────────"
ask stores | python3 -c '
import json, sys
d = json.load(sys.stdin)
for s in d.get("data", []):
    a = s.get("attributes", {})
    print("  STORE_ID = %-10s %s  (%s)" % (s["id"], a.get("name", "?"), a.get("currency", "?")))
'

echo
echo "── Variante ──────────────────────────────────────────"
echo "   ia-o pe cea a produsului tau; test = test mode"
echo
ask "variants?include=product" | python3 -c '
import json, sys
d = json.load(sys.stdin)
# Numele produsului sta in "included", nu langa varianta.
prod = {}
for p in d.get("included", []):
    if p.get("type") == "products":
        prod[p["id"]] = p.get("attributes", {}).get("name", "?")
rows = d.get("data", [])
if not rows:
    print("  Niciuna. Ai publicat produsul? Un produs in ciorna nu are varianta.")
for v in rows:
    a = v.get("attributes", {})
    mode = "test" if a.get("test_mode") else "LIVE"
    print("  VARIANT_ID = %-10s [%s]  %s / %s  (%s)" % (
        v["id"], mode, prod.get(str(a.get("product_id", "")), "?"),
        a.get("name", "?"), a.get("status", "?")))
'
echo
echo "Pune-le apoi cu:  bash deploy/set-keys.sh"
