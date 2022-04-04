#!/bin/bash

set -euxo pipefail

enableLogDebug=false

if [ "${NODE_ENV:-"production"}" = "development" ]; then
  enableLogDebug=true
fi

export SUPPRESS_NO_CONFIG_WARNING=true
export NODE_CONFIG="{\"app\":{\"port\":\"${API_PORT}\",\"host\":\"${BIND_HOST}\"},\"grenacheClient\":{\"grape\":\"http://$GRAPE_HOST:$GRAPE_APH\"},\"enableLog\":true,\"enableLogDebug\":$enableLogDebug}"

set -- node "$@"

exec "$@"
