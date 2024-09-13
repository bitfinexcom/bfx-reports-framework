#!/bin/bash

set -euo pipefail

SCRIPTPATH="$(cd -- "$(dirname "$0")" >/dev/null 2>&1; pwd -P)"
ROOT="$(dirname "$SCRIPTPATH")"
CURRDIR="$PWD"

DOCKER_COMPOSE_CMD=("docker" "compose")
"${DOCKER_COMPOSE_CMD[@]}" version 2>/dev/null || DOCKER_COMPOSE_CMD=("docker-compose")

if [ -n "${1:-}" ] && [[ "$1" =~ ^SECRET_KEY= ]]; then
  export SECRET_KEY=$(echo $1| cut -d'=' -f 2)
fi

maintenanceFileFlag="$ROOT/scripts/maintenance/maintenance.on"

"$ROOT/scripts/sync-repo.sh" "-a"

cd "$ROOT"
runningServices=$("${DOCKER_COMPOSE_CMD[@]}" ps --filter "status=running" --services)
isNginxRunning=$(echo "$runningServices" | { grep 'nginx' || test $? = 1; } | wc -l)

touch "$maintenanceFileFlag"

if [ $isNginxRunning == 0 ]; then
  "$ROOT/scripts/launch.sh" "-ad"
else
  "$ROOT/scripts/launch.sh" "-weud"
fi

rm -rf "$maintenanceFileFlag"

cd "$CURRDIR"
