#!/bin/bash

set -euo pipefail

USER_NAME="ubuntu"
HOME="/home/$USER_NAME"
ROOT="$HOME/bfx-reports-framework"

rm -rf "$ROOT"
mkdir "$ROOT" 2>/dev/null
chown $USER_NAME:$USER_NAME -R "$ROOT"

envFilePath="$ROOT/.env"

env="${env}"
nginxAutoindex="${nginx_autoindex}"
repoFork="${repo_fork}"
repoBranch="${repo_branch}"
nginxPort="${nginx_port}"
nginxHost="${nginx_host}"
secretKey="${secret_key}"

function setConfig {
  local filePath="$1"
  local propName="$2"
  local value="$3"

  escapedValue=$(echo $value \
    | sed 's/\//\\\//g' \
    | sed 's/\+/\\\+/g' \
    | sed 's/\./\\\./g')

  sed -i "s/^$propName.*/$propName=$escapedValue/g" "$filePath"
  grep -q "^$propName" "$filePath" \
    || echo "$propName=$escapedValue" >> "$filePath"
}

git clone -b $repoBranch https://github.com/$repoFork/bfx-reports-framework.git "$ROOT"

cd "$ROOT"
export REPO_BRANCH="$repoBranch"
"$ROOT/scripts/setup.sh" "-y"
setConfig "$envFilePath" "NGINX_AUTOINDEX" $nginxAutoindex
setConfig "$envFilePath" "REPO_BRANCH" $repoBranch
setConfig "$envFilePath" "NGINX_PORT" $nginxPort
setConfig "$envFilePath" "NGINX_HOST" $nginxHost
setConfig "$envFilePath" "SECRET_KEY" $secretKey

"$ROOT/scripts/deploy.sh"
