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

- Docker version 27.2.0
- docker-compose version 2.24.6
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
- to remove all Log and DB and report files to setup the app from scratch
- to choose syncing repository branch (master/staging), by default master
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

## Terraform IaaS

This section describes the implementation of automated infrastructure setting-up in the [AWS](https://aws.amazon.com) cloud provider and the automated deployment process using [Terraform](https://www.terraform.io), it's an open-source infrastructure as code software tool, check [Intro to Terraform](https://www.terraform.io/intro). Terraform community has already written plenty of providers. All publicly available providers can be found on the Terraform Registry, including [Amazon Web Services (AWS)](https://registry.terraform.io/providers/hashicorp/aws/latest/docs). Functionality has been tested on `Ubuntu 20.04 LTS`

### Main Modules Structure

The infrastructure configuration is located in the `./terraform` directory of the project root. It consists of modules with the following structure:

- `app` - contains the main application configuration, and consists of submodules:
  - `network` - creates VPC resources, based on [AWS VPC Terraform module](https://github.com/terraform-aws-modules/terraform-aws-vpc)
  - `ec2` - creates resources to setup Ubuntu instance, attach volume for DB, set deployment process, generate bash script file as an easy way to have an ability to connect via SSH
  - `ssh_key` - creates SSH private/public keys resources
  - `kms_key` - creates AWS KMS key resources for encryption purposes of DB volume
  - `ssm_param_secret_key` - creates AWS SSM parameter to have secure storage of generated on setup step `Private Key` used to encrypt user's `apiKey`/`apiSecret`
- `backend` - creates resources to setup remote state management with S3 backend for your account. Based on [remote state S3 backend module](https://github.com/nozaq/terraform-aws-remote-state-s3-backend)

### Requirements to use Terraform

The setup was tested with the following dependencies:

- Terraform version 1.9.5

> To use Terraform you will need to install it. [This official tutorial](https://learn.hashicorp.com/tutorials/terraform/install-cli) will be useful to install Terraform.

### Setting

To follow this instructions you will need AWS account and [associated credentials](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html) that allow you to create resources. Enter AWS Access keys into the `terraform/config/credentials.conf` file as shown below:

```console
cp terraform/config/credentials.conf.example terraform/config/credentials.conf
vim terraform/config/credentials.conf
```

To be able to override default values of cofigurable variables of infrastructure use `terraform/terraform.tfvars` file as shown below:

```console
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
vim terraform/terraform.tfvars
```

In that `terraform/terraform.tfvars` file placed the main important variables useful for customization. More available variables may be seen in the `terraform/variables.tf` file. Be careful, overriding some variables without deep understanding can bring unexpected behavior.

### Bootstrap the project with S3 backend management for tfstate files

Terraform must store state about your managed infrastructure and configuration. This state is used by Terraform to map real world resources to your configuration, keep track of metadata, and to improve performance for large infrastructures.

This state is stored by default in a local file named `terraform/terraform.tfstate`, but it can also be stored remotely, which works better in a team environment. For more info check the following links:

- [Terraform State](https://www.terraform.io/language/state)
- [Backends](https://www.terraform.io/language/settings/backends)

**Why does this exist?**

> One of the most popular backend options for terraform is AWS (S3 for state, and DynamoDB for the lock table). If your project specifies an AWS/S3 backend, Terraform requires the existence of an S3 bucket in which to store state information about your project, and a DynamoDB table to use for locking (this prevents you, your collaborators, and CI from stepping on each other with terraform commands which either modify your state or the infrastructure itself).

Currently, this configuration provides a preset for [S3 Backend](https://www.terraform.io/language/settings/backends/s3)

To manage the project use the fillowing commands:

```console
cd terraform

# Prepare your working directory for other commands. Whenever a configurations backend changes, you must run terraform init again to validate and configure the backend before you can perform any plans, applies, or state operations
terraform init

# Create backend infrastructure
terraform apply -target=module.backend

# Re-configure the backend
terraform init -reconfigure -backend-config=config/backend.conf

# Create or update infrastructure
terraform apply

# WARNING: The below commands are useful when you want to destroy previously-created infrastructure
terraform destroy -target=module.app
terraform apply -target=module.backend -var=is_backend_s3_config_removed=true
terraform init -migrate-state
```

> For the `production` environment strongly recommended to use flow with S3 Backend. But it can be redundant for the `development` or `test` env. Check the below section to get an easier way to bootstrap the project without S3 backend management.

### Bootstrap the project without S3 backend management for tfstate files

To disable S3 backend management set `is_backend_s3_enabled=false` in the `terraform/terraform.tfvars` file. And right now you can use the default backend called `local` to store state as a local file on disk.

To manage the project use the fillowing commands:

```console
cd terraform

# Prepare your working directory for other commands. Whenever a configurations backend changes, you must run terraform init again to validate and configure the backend before you can perform any plans, applies, or state operations
terraform init

# Create or update infrastructure
terraform apply

# WARNING: The below commands are useful when you want to destroy previously-created infrastructure
terraform destroy
```

### Deployment

To setup the deployment process need to execute terraform apply of the plan. Each time the command is executed, it will execute [remote-exec Provisioner](https://www.terraform.io/language/resources/provisioners/remote-exec). That Provisioner will connect to the AWS EC2 instance via SSH and launch the `scripts/deploy.sh` bash script described above.

To deploy the project just use the fillowing command:

```console
cd terraform

terraform apply
```

### Notes

- After applying Terraform infrastructure, some useful outputs will be shown in the terminal. One of those being the `Public DNS`, the address as to access the react app. Check the available outputs in the `terraform/outputs.tf` file.

Example of Outputs:

```console
Apply complete! Resources: 1 added, 0 changed, 1 destroyed.

Outputs:

bfx_reports_framework_pub_dns = "ec2-1-234-56-78.eu-central-1.compute.amazonaws.com"
bfx_reports_framework_pub_ip = "1.234.56.78"
```

- A SSH key and a bash script file will be created in Terraform folder as to connect via SSH to AWS EC2. The path to those files will be:

- `terraform/bfx-ssh-key.pem`
- `terraform/worker-connect.sh`
