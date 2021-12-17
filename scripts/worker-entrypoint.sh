#!/bin/bash

set -euxo pipefail

if [ "$SECRET_KEY" != "" ]; then
  printf '%s\n' "'SECRET_KEY' environment variable must be exported" >&2
  exit 1
fi

set -- node "$@" \
  "--wtype" "wrk-report-framework-api" \
  "--isSchedulerEnabled" "true" \
  "--env" "$NODE_ENV" \
  "--apiPort" "$WORKER_API_PORT" \
  "--wsPort" "$WORKER_WS_PORT" \
  "--csvFolder" "$CSV_FOLDER" \
  "--dbFolder" "$DB_FOLDER" \
  "--logsFolder" "$LOGS_FOLDER" \
  "--tempFolder" "$TEMP_FOLDER" \
  "--grape" "http://$GRAPE_HOST:$GRAPE_APH" \
  "--secretKey" "$SECRET_KEY"

if [ "$SCHEDULER_RULE" != "" ]; then
  set -- node "$@" "--schedulerRule" "$SCHEDULER_RULE"
fi

exec "$@"
