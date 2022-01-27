#!/bin/bash

set -euo pipefail

if [ -z "${SECRET_KEY:-}" ]; then
  printf '%s\n' "'SECRET_KEY' environment variable must be exported" >&2
  exit 1
fi

set -- node "$@" \
  "--wtype" "wrk-report-framework-api" \
  "--isSchedulerEnabled" "true" \
  "--env" "$NODE_ENV" \
  "--apiPort" "$WORKER_API_PORT" \
  "--wsPort" "$WORKER_WS_PORT" \
  "--tempFolder" "$TEMP_FOLDER" \
  "--dbFolder" "$DB_FOLDER" \
  "--csvFolder" "$CSV_FOLDER" \
  "--logsFolder" "$LOGS_FOLDER" \
  "--grape" "http://$GRAPE_HOST:$GRAPE_APH" \
  "--secretKey" "$SECRET_KEY"

if [ -n "${SCHEDULER_RULE:-}" ]; then
  set -- "$@" "--schedulerRule" "$SCHEDULER_RULE"
fi

exec "$@"
