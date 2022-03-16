#!/bin/bash

set -euo pipefail

USER_NAME="${user_name}"
ROOT="${root_dir}"
DB_VOLUME_DEVICE_NAME="${db_volume_device_name}"

dbFolderPath="$ROOT/db"
envFilePath="$ROOT/.env"

rm -rf "$ROOT"
mkdir "$ROOT" 2>/dev/null
chown $USER_NAME:$USER_NAME -R "$ROOT"

git clone -b $repoBranch https://github.com/$repoFork/bfx-reports-framework.git "$ROOT"

fsType="cannot"

while [[ "$fsType" = "cannot" ]]; do
  fsType=$(file -s $DB_VOLUME_DEVICE_NAME | awk '{print $2}')

  if [ "$fsType" = "cannot" ]; then
    sleep 5
  fi
done

if [ "$fsType" = "data" ]; then
  echo "Creating file system on $DB_VOLUME_DEVICE_NAME"
  mkfs -t ext4 $DB_VOLUME_DEVICE_NAME
fi

mkdir "$dbFolderPath" 2>/dev/null
mount "$DB_VOLUME_DEVICE_NAME" "$dbFolderPath"
BLK_ID=$(blkid $DB_VOLUME_DEVICE_NAME | cut -f2 -d" ")
echo "$BLK_ID   $dbFolderPath   ext4   defaults   0   2" | tee --append /etc/fstab

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

cd "$ROOT"
export REPO_BRANCH="$repoBranch"
"$ROOT/scripts/setup.sh" "-y"
setConfig "$envFilePath" "NGINX_AUTOINDEX" $nginxAutoindex
setConfig "$envFilePath" "REPO_BRANCH" $repoBranch
setConfig "$envFilePath" "NGINX_PORT" $nginxPort
setConfig "$envFilePath" "NGINX_HOST" $nginxHost
setConfig "$envFilePath" "SECRET_KEY" $secretKey

"$ROOT/scripts/deploy.sh"
