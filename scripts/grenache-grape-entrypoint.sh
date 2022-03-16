#!/bin/bash

set -euxo pipefail

set -- node "$@" \
  "--dp" "$GRAPE_DP" \
  "--aph" "$GRAPE_APH" \
  "--bn" "$GRAPE_BIND:$GRAPE_BN"

exec "$@"
