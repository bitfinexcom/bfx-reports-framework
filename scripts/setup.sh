#!/bin/bash

set -euo pipefail

SCRIPTPATH="$(cd -- "$(dirname "$0")" >/dev/null 2>&1; pwd -P)"
ROOT="$(dirname "$SCRIPTPATH")"

COLOR_RED="\033[31m"
COLOR_GREEN="\033[32m"
COLOR_YELLOW="\033[33m"
COLOR_BLUE="\033[34m"
COLOR_NORMAL="\033[39m"

askUser() {
  local question="${1:-"What should be done"}"

  local yesptrn="^[+1yY]"
  local noptrn="^[-0nN]"
  local yesword="yes"
  local noword="no"

  local formattedQestion=$(echo -e "\
\n${COLOR_BLUE}$question \
(${COLOR_GREEN}${yesword}${COLOR_BLUE} / \
${COLOR_RED}${noword}${COLOR_BLUE})?${COLOR_NORMAL}\
")

  while true; do
    read -p "$formattedQestion " answer

    if [[ "$answer" =~ $yesptrn ]]; then
      true
      return
    fi
    if [[ "$answer" =~ $noptrn ]]; then
      false
      return
    fi

    echo -e "\
\n${COLOR_RED}Available answer \
'${yesword}' / '${noword}'!${COLOR_NORMAL}\
" >&2

  done
}

askUserAboutBranch() {
  local masterBranch="master"
  local betaBranch="beta"
  local masterptrn="^$masterBranch$"
  local betaptrn="^$betaBranch$"

  local formattedQestion=$(echo -e "\
\n${COLOR_BLUE}Choose syncing repository branch, by default '${COLOR_NORMAL}master${COLOR_BLUE}'\
\nto apply it just push the 'Enter' key \
(${COLOR_GREEN}${masterBranch}${COLOR_BLUE} / \
${COLOR_YELLOW}${betaBranch}${COLOR_BLUE})?${COLOR_NORMAL}\
")

  while true; do
    read -p "$formattedQestion " answer

    if [[ -z $answer ]] || [[ "$answer" =~ $masterptrn ]]; then
      echo "$masterBranch"
      return
    fi
    if [[ "$answer" =~ $betaptrn ]]; then
      echo "$betaBranch"
      return
    fi

    echo -e "\
\n${COLOR_RED}Available answer \
'${masterBranch}' / '${betaBranch}'!${COLOR_NORMAL}\
" >&2

  done
}

if ! docker --version; then
  echo -e "\
\n${COLOR_RED}Docker has not been found\
${COLOR_NORMAL}" >&2

  if askUser "Should here try to install Docker using the 'convenience script'"; then
    # Docker provides a convenient installation script:
    # https://docs.docker.com/engine/install/ubuntu/#install-using-the-convenience-script
    # https://github.com/docker/docker-install

    dockerScriptPath="$SCRIPTPATH/get-docker.sh"
    curl -fsSL https://get.docker.com -o "$dockerScriptPath"
    sudo sh "$dockerScriptPath"
    rm -f "$dockerScriptPath"
  fi
fi

if ! docker-compose --version; then
  echo -e "\
\n${COLOR_RED}Docker-compose has not been found\
${COLOR_NORMAL}" >&2

  if askUser "Should here try to install docker-compose"; then
    # Install Compose on Linux systems
    # https://docs.docker.com/compose/install/#install-compose-on-linux-systems

    sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose 2>/dev/null

    docker-compose --version
  fi
fi

if askUser "\
The app will be setup from scratch!\n\
All Log and DB and CSV files will be removed!\n\
Are you sure?\
"; then
  rm -rf "$ROOT/logs"
  rm -rf "$ROOT/csv"
  find "$ROOT/db" ! -path "$ROOT/db/.gitkeep" -type f -exec rm -rf {} +
fi

secretKey=$({ dd if=/dev/urandom bs=256 count=1 || test $? = 1; } 2>/dev/null | od -A n -t x | tr -d '\n| ')
size=${#secretKey}

if [ $size != 512 ]; then
  echo -e "\
\n${COLOR_RED}The secret key has not been generated!\n
The default value 'secretKey' will be set to 'SECRET_KEY'.\n
Please change it setting the corresponding environment variable for security.\
${COLOR_NORMAL}" >&2

  secretKey="secretKey"
else
  echo -e "\
\n${COLOR_GREEN}A new secret key has been generated successfully:${COLOR_NORMAL}\n\n\
$secretKey\
\n\n${COLOR_YELLOW}Warning, don't store secret key value in the '.env' file for production,\n\
need to set it into 'SECRET_KEY' environment variable!\
${COLOR_NORMAL}"
fi

repoBranch=$(askUserAboutBranch)

nginxPortQestion=$(echo -e "\
\n${COLOR_BLUE}Enter NGINX port, by default '${COLOR_NORMAL}80${COLOR_BLUE}',\
\nto apply it just push the 'Enter' key\
${COLOR_NORMAL}")
read -p "$nginxPortQestion " nginxPort
nginxPort=${nginxPort:-80}

nginxHostQestion=$(echo -e "\
\n${COLOR_BLUE}Enter NGINX host, by default '${COLOR_NORMAL}localhost${COLOR_BLUE}',\
\nto apply it just push the 'Enter' key\
${COLOR_NORMAL}")
read -p "$nginxHostQestion " nginxHost
nginxHost="${nginxHost:-"localhost"}"

echo "DONE"
