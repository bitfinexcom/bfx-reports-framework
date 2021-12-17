#!/bin/bash

set -euxo pipefail

export SUPPRESS_NO_CONFIG_WARNING=true
export NODE_CONFIG="{\"app\":{\"port\":\"${API_PORT}\",\"host\":\"0.0.0.0\"},\"grenacheClient\":{\"grape\":\"http://$GRAPE_HOST:$GRAPE_APH\"}}"

set -- node "$@"

exec "$@"
