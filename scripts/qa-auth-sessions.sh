#!/usr/bin/env bash
# Abre una ventana VISIBLE por rol para que la persona inicie sesión a mano y guarda
# el estado en .auth/<rol>.json (carpeta ignorada por git). No guarda credenciales en
# el script ni las imprime. Uso: scripts/qa-auth-sessions.sh [admin|student-a|student-b]
set -euo pipefail
cd "$(dirname "$0")/.."
BASE="${QA_BASE_URL:-http://localhost:3001}"
git check-ignore -q .auth/ || { echo "ERROR: .auth/ no está ignorado por git"; exit 1; }
mkdir -p .auth
roles=("${@:-admin student-a student-b}")
[ "$#" -eq 0 ] && roles=(admin student-a student-b)
for role in "${roles[@]}"; do
  echo "== ${role}: inicia sesión en la ventana que se abre y vuelve aquí."
  playwright-cli -s="qa-${role}" open "${BASE}/login" --headed
  read -r -p "Pulsa Enter cuando hayas iniciado sesión como ${role}... " _
  playwright-cli -s="qa-${role}" state-save ".auth/${role}.json"
  playwright-cli -s="qa-${role}" close
  echo "   guardado .auth/${role}.json"
done
