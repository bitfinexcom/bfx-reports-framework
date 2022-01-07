#!/bin/bash

set -euxo pipefail

if [ -z "${NGINX_HOST:-}" ]; then
  printf '%s\n' "'API_PORT' environment variable must be exported" >&2
  exit 1
fi

if [ -z "${CI_ENVIRONMENT_NAME:-}" ]; then
  export CI_ENVIRONMENT_NAME=production
fi

export SKIP_PREFLIGHT_CHECK=true

ROOT="$PWD"
frontBuildFolder=${FRONT_BUILD_FOLDER:-"$ROOT/front-build"}
uiBuildFolder="$ROOT/build"

if ! [ -s "$frontBuildFolder/index.html" ]; then
  cp -f var/www/html/maintenance.html "$frontBuildFolder/index.html"
fi

rm -rf $uiBuildFolder/bfx-report-express/*

sed -i -e \
  "s/HOME_URL: .*,/HOME_URL: \'http:\/\/${NGINX_HOST}',/g" \
  $ROOT/src/config.js
sed -i -e \
  "s/API_URL: .*,/API_URL: \'http:\/\/${NGINX_HOST}\/api\',/g" \
  $ROOT/src/config.js
sed -i -e \
  "s/WS_ADDRESS: .*,/WS_ADDRESS: \'ws:\/\/${NGINX_HOST}\/ws\',/g" \
  $ROOT/src/config.js

sed -i -e \
  "s/localExport: false/localExport: true/g" \
  $ROOT/src/config.js
sed -i -e \
  "s/showAuthPage: false/showAuthPage: true/g" \
  $ROOT/src/config.js
sed -i -e \
  "s/showFrameworkMode: false/showFrameworkMode: true/g" \
  $ROOT/src/config.js

npm run build

if ! [ -s "$uiBuildFolder/index.html" ]; then
  printf '%s\n' "The UI build has not been completed successfully" >&2
  exit 1
fi

rm -rf $frontBuildFolder/*
cp -f var/www/html/maintenance.html "$frontBuildFolder/index.html"
mv -f $uiBuildFolder/* $frontBuildFolder

echo "The UI build has been completed successfully"
