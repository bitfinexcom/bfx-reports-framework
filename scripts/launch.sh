#!/bin/bash

set -euo pipefail

SCRIPTPATH="$(cd -- "$(dirname "$0")" >/dev/null 2>&1; pwd -P)"
ROOT="$(dirname "$SCRIPTPATH")"
CURRDIR="$PWD"

COLOR_RED="\033[31m"
COLOR_GREEN="\033[32m"
COLOR_BLUE="\033[34m"
COLOR_NORMAL="\033[39m"

programname=$0

launchAll=0
launchGrapes=0
launchWorker=0
launchExpress=0
launchNginx=0
buildUI=0
detachedMode=""

function usage {
  echo -e "\
\n${COLOR_GREEN}Usage: $programname [options] [-d] | [-h]${COLOR_BLUE}
\nOptions:
  -a    Launch all repositories
  -g    Launch grenache-grape network only
  -w    Launch bfx-reports-framework worker only
  -e    Launch bfx-report-express server only
  -n    Launch NGINX reverse proxy server only
  -u    Build bfx-report-ui static files only
  -d    Detached mode: Run containers in the background
  -h    Display help\
${COLOR_NORMAL}" 1>&2
}

if [ $# == 0 ]; then
  usage
  exit 1
fi

while getopts "agwenudh" opt; do
  case "${opt}" in
    a) launchAll=1;;
    g) launchGrapes=1;;
    w) launchWorker=1;;
    e) launchExpress=1;;
    n) launchNginx=1;;
    u) buildUI=1;;
    d) detachedMode="-d";;
    h)
      usage
      exit 0
      ;;
    *)
      echo -e "\n${COLOR_RED}No reasonable options found!${COLOR_NORMAL}"
      usage
      exit 1
      ;;
  esac
done

cd "$ROOT"

if [ $launchGrapes == 1 ] \
  && [ $launchWorker == 1 ] \
  && [ $launchExpress == 1 ] \
  && [ $launchNginx == 1 ] \
  && [ $buildUI == 1 ]
then
  launchAll=1
  launchGrapes=0
  launchWorker=0
  launchExpress=0
  launchNginx=0
  buildUI=0
fi

composeCommonFlags="\
  --build \
  --force-recreate \
  --remove-orphans \
  --timeout 2 \
  $detachedMode \
"

if [ $launchAll == 1 ]; then
  docker-compose up $composeCommonFlags \

  cd "$CURRDIR"
  exit 0
fi

grapesServices=""
workerService=""
expressService=""

if [ $launchGrapes == 1 ]; then
  grapesServices="grape1 grape2"
fi
if [ $launchWorker == 1 ]; then
  runningServices=$(docker-compose ps --filter "status=running" --services)
  isGrape1Running=$(echo "$runningServices" | { grep 'grape1' || test $? = 1; } | wc -l)
  isGrape2Running=$(echo "$runningServices" | { grep 'grape2' || test $? = 1; } | wc -l)

  if [ $isGrape1Running == 0 ]; then
    grapesServices="grape1 $grapesServices"
  fi
  if [ $isGrape2Running == 0 ]; then
    grapesServices="$grapesServices grape2"
  fi

  workerService="worker"
fi
if [ $launchExpress == 1 ]; then
  expressService="express"
fi

if [ $launchGrapes == 1 ] \
  || [ $launchWorker == 1 ] \
  || [ $launchExpress == 1 ]
then
  grapesServices="$(echo -e "${grapesServices}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  docker-compose up $composeCommonFlags \
    $grapesServices $workerService $expressService
fi
if [ $launchNginx == 1 ]; then
  docker-compose up $composeCommonFlags --no-deps \
    nginx
fi
if [ $buildUI == 1 ]; then
  docker-compose up $composeCommonFlags --no-deps \
    ui-builder
fi

cd "$CURRDIR"
