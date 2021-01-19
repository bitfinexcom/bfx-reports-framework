#!/bin/bash

set -x

ROOT="$PWD"
frontendFolder="$ROOT/bfx-report-ui"
expressFolder="$frontendFolder/bfx-report-express"
dbDriver=better-sqlite

programname=$0
isDevEnv=0
ip=0

function usage {
  echo "Usage: $programname [-d] | [-i] | [-u] | [-h]"
  echo "  -d                 turn on developer environment"
  echo "  -i=XX.XX.XX.XX     adds ip as to run on an external network"
  echo "  -u=URL             adds URL as to run on an external network"
  echo "  -h                 display help"
  exit 1
}

function installDeps {
  local path="$PWD"

  if [ $# -ge 1 ]
  then
    cd "$1"
  else
    exit 1
  fi

  rm -rf ./node_modules
  npm i

  cd "$path"
}

while [ "$1" != "" ]; do
  case $1 in
    -d | --dev )    isDevEnv=1
                    ;;
    -i | --ip )     shift
                    ip=$1
                    ;;
    -u | --url )    shift
                    ip=$1
                    ;;
    -h | --help )   usage
                    exit
                    ;;
    * )             usage
                    exit 1
  esac
  shift
done

if [ "$CI_ENVIRONMENT_NAME" == "" ]
then
  export CI_ENVIRONMENT_NAME=development
fi

if [ $isDevEnv != 0 ]; then
  echo "Developer environment is turned on"
fi

if [ $ip != 0 ]; then
  echo "Ip is set to: $ip"
fi

git submodule foreach --recursive git clean -fdx
git submodule foreach --recursive git reset --hard HEAD
git submodule sync --recursive
git submodule update --init --recursive
git config url."https://github.com/".insteadOf git@github.com:
git pull --recurse-submodules
git submodule update --remote --recursive
git config --unset url."https://github.com/".insteadOf

if [ $isDevEnv != 0 ]; then
	sed -i -e \
    "s/KEY_URL: .*,/KEY_URL: \'https:\/\/api.staging.bitfinex.com\/api\',/g" \
    $frontendFolder/src/config.js
fi

if [ $ip != 0 ]; then
	sed -i -e \
    "s/API_URL: .*,/API_URL: \'http:\/\/$ip:31339\/api\',/g" \
    $frontendFolder/src/config.js
  sed -i -e \
    "s/WS_ADDRESS: .*,/WS_ADDRESS: \'ws:\/\/$ip:31339\/ws\',/g" \
    $frontendFolder/src/config.js
  sed -i -e \
    "s/HOME_URL: .*,/HOME_URL: \'http:\/\/$ip:3000\',/g" \
    $frontendFolder/src/config.js
fi

cp $expressFolder/config/default.json.example \
  $expressFolder/config/default.json

cp config/schedule.json.example config/schedule.json
cp config/common.json.example config/common.json
cp config/service.report.json.example config/service.report.json
cp config/facs/grc.config.json.example config/facs/grc.config.json

sed -i -e \
  "s/\"syncMode\": false/\"syncMode\": true/g" \
  $ROOT/config/service.report.json
sed -i -e \
  "s/\"dbDriver\": \".*\"/\"dbDriver\": \"$dbDriver\"/g" \
  $ROOT/config/service.report.json

if [ $isDevEnv != 0 ]; then
  sed -i -e \
    "s/\"restUrl\": \".*\"/\"restUrl\": \"https:\/\/api.staging.bitfinex.com\"/g" \
    $ROOT/config/service.report.json
fi

installDeps $ROOT
installDeps $expressFolder
installDeps $frontendFolder
