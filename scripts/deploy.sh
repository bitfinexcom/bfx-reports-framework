#!/bin/bash

set -euo pipefail

SCRIPTPATH="$(cd -- "$(dirname "$0")" >/dev/null 2>&1; pwd -P)"
ROOT="$(dirname "$SCRIPTPATH")"
CURRDIR="$PWD"

maintenanceFileFlag="$ROOT/scripts/maintenance/maintenance.on"

"$ROOT/scripts/sync-repo.sh" "-a"

cd "$ROOT"
runningServices=$(docker-compose ps --filter "status=running" --services)
isNginxRunning=$(echo "$runningServices" | { grep 'nginx' || test $? = 1; } | wc -l)

touch "$maintenanceFileFlag"

if [ $isNginxRunning == 0 ]; then
  "$ROOT/scripts/launch.sh" "-ad"
else
  "$ROOT/scripts/launch.sh" "-weud"
fi

rm -rf "$maintenanceFileFlag"

cd "$CURRDIR"
