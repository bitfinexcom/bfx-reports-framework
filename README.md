# Bfx Reports Framework

## Description

Bfx Reports Framework is a Reactjs and Nodejs open source framework with License Apache 2.0 for Bitfinex and Ethfinex users that can be used to build financial Reports. </br>
When running the software the result is similar to what is hosted on https://www.bitfinex.com/reports </br>
Including main structures and libraries gives the possibility for developers to create their personalized reports. </br>

Bfx Reports Framework can be run by its own, without need of adding code, it already includes some exiting features not included on what is hosted on website.

### Included Features
- All reports and tools from https://www.bitfinex.com/reports
- Possibility to work without a connection to internet.
- All ledgers and wallet values expressed in USD or other Forex currency

### Composition
- https://github.com/bitfinexcom/bfx-report-ui UI components
- https://github.com/bitfinexcom/bfx-report-express Express server
- https://github.com/bitfinexcom/bfx-report Base from where back-end service extends from

## Setup

### Install

- Clone Github repository and install projects dependencies :

```console
git clone https://github.com/bitfinexcom/bfx-reports-framework.git
cd bfx-reports-framework
npm run init
```
- As to run framework on a network different that localhost, add to init the IP or URL as following:

```console
./init.sh -i XX.XX.XX.XX (being XX.XX.XX.XX the ip)
or
./init.sh -u URL
```

### Configure service

When running `node init.sh` configuration is done automatically. </br>
As to check instructions of how to configure each component, visit the git repositories of the components listed above.

## Other Requirements

### Grenache network

- Install `Grenache Grape`: <https://github.com/bitfinexcom/grenache-grape>:

```console
npm i -g grenache-grape
```

## Run

As to run the software, is needed to run the network and services separately.

### Run grenache network

- Run two Grapes

```console
grape --dp 20001 --aph 30001 --bn '127.0.0.1:20002'
grape --dp 20002 --aph 40001 --bn '127.0.0.1:20001'
```

### Run all framework services

- From main folder, run:

```console
npm run start
```


## Testing

### Run tests

```console
npm test
```

## Docker release

A pre-configured [Docker/docker-compose](https://www.docker.com) infrastructure is provided to run the reports framework on an independent Linux server for individual user use. Functionality has been tested on `Ubuntu 20.04 LTS`

### Main Structure

The following Docker containers are launched:

- `grape1` and `grape2` to run the [grenache-grape](https://github.com/bitfinexcom/grenache-grape) network with two grapes. For it provides `Dockerfile.grenache-grape` file
- `worker` to run the main grenache `bfx-reports-framework` worker which contains the general business logic. For it provides `Dockerfile.worker` file
- `express` to run the lightweight server for proxying requests to the grenache `worker`. For it provides `Dockerfile.express` file
- `ui-builder` to run a building proccess of UI static files. For it provides `Dockerfile.ui-builder` file
- `nginx` to run the [reverse proxy server](https://www.nginx.com/resources/glossary/reverse-proxy-server)

To simplify setup/deploy processes the following bash scripts are provided:

- `./scripts/setup.sh` - CLI as an easy way to get through the setup process
- `./scripts/sync-repo.sh` - CLI to fetch the last changes of the repository/sub-modules from the main remote repo
- `./scripts/launch.sh` - CLI to launch/re-launch docker-compose services to apply the last fetched changes
- `./scripts/deploy.sh` - simple deploy script which sync all repo with remote and launch all services

### Requirements

The setup was tested with the following dependencies:

- Docker version 20.10.12
- docker-compose version 1.29.2
- git version 2.24.1

### Setup process

After cloning the repository there's needed to configure the app. For it can be used `./scripts/setup.sh` bash script
Available the following arguments:

```console
./scripts/setup.sh -h

Usage: ./scripts/setup.sh [options] [-d] | [-h]

Options:
  -y    With this option, all questions are automatically answered with 'Yes'. In this case, the questions themselves will not be displayed
  -n    Don't remove files of DBs
  -h    Display help
```

During the setup process, the user will be asked some questions

- if no Docker/docker-compose are found, the user will be prompted to install them
- to remove all Log and DB and CSV files to setup the app from scratch
- to choose syncing repository branch (master/beta), by default master
- to set NGINX port, by default 80
- to set NGINX host, by default localhost
- to sync all repository/sub-modules (there will be run `./scripts/sync-repo.sh` script)

Based on the responses, a `.env` file will be configured with the following default values:

```console
NODE_ENV=production
UI_ENV=production
NGINX_ENV=production

NGINX_AUTOINDEX=on

REPO_BRANCH=master

NGINX_PORT=80
NGINX_HOST=localhost
SECRET_KEY=secretKey
```

> Pay attention, for security reasons, don't recommend storing secret key value in the `.env` file for production, need to set it into `SECRET_KEY` environment variable!

### Sync repo process

In case needs to fetch the last changes all repository/sub-modules might be used `./scripts/sync-repo.sh` bash script
Available the following arguments:

```console
./scripts/setup.sh -h

Usage: ./scripts/sync-repo.sh [options] | [-h]

Options:
  -a    Sync all repositories
  -w    Sync bfx-reports-framework only
  -u    Sync bfx-report-ui only
  -e    Sync bfx-report-express only
  -h    Display help
```

### Launch process

To launch/re-launch the docker-compose services of the app available the `./scripts/launch.sh` bash script
Available the following arguments:

```console
./scripts/launch.sh -h

Usage: ./scripts/launch.sh [options] [-d] | [-h]

Options:
  -a    Launch all repositories
  -g    Launch grenache-grape network only
  -w    Launch bfx-reports-framework worker only
  -e    Launch bfx-report-express server only
  -n    Launch NGINX reverse proxy server only
  -u    Build bfx-report-ui static files only
  -d    Detached mode: Run containers in the background
  -h    Display help
```

> To run containers of the app in the background, use `-d` argument for the `Detached mode`

### Deploy process

Provides the simple deploy bash script `./scripts/deploy.sh`
It provide the following steps:

- add a maintenance flag to show maintenance HTML `./scripts/maintenance/index.html` page via NGINX when the deploy process is going on
- sync all repository/sub-modules
- relaunch all docker-compose services except `nginx` service
- remove the maintenance flag
