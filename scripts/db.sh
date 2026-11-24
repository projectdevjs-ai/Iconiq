#!/usr/bin/env bash
# Exécute un fichier SQL sur la base Supabase du jeu (jeton injecté par le proxy de la session).
# Usage : scripts/db.sh fichier.sql   |   echo "select 1" | scripts/db.sh -
R=mtjwbvlagrltfptwaoms
f=${1:--}
python3 -c "import json,sys;print(json.dumps({'query':open(sys.argv[1]).read() if sys.argv[1]!='-' else sys.stdin.read()}))" "$f" \
 | curl -sS -m 120 -X POST "https://api.supabase.com/v1/projects/$R/database/query" -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN:-proxy-injected}" -H "Content-Type: application/json" --data-binary @-
echo
