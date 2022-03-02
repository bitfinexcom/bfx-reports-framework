provider "aws" {
  profile = "default"
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
  region = var.aws_region
}

locals {
  common_tags = merge(
    var.common_tags,
    { Environment = var.env }
  )
}

module "network" {
  source = "./modules/network"
  namespace = var.namespace
  vpc_cidr = var.aws_vpc_cidr
  common_tags = var.common_tags
  allowed_ports = var.allowed_ports
}

resource "aws_instance" "bfx_reports_framework_ubuntu" {
  ami = data.aws_ami.ubuntu.id
  instance_type = var.aws_instance_type
  monitoring = var.aws_instance_detailed_mon

  user_data = templatefile("setup.sh.tpl", {
    env = var.env
    nginx_autoindex = var.nginx_autoindex
    repo_fork = var.repo_fork
    repo_branch = var.repo_branch
    nginx_port = var.nginx_port
    nginx_host = module.network.public_dns
    secret_key = var.secret_key # TODO: AWS SSM Parameter Store
  })

  vpc_security_group_ids = [module.network.sec_gr_pub_id]
  subnet_id = module.network.vpc.public_subnets[0]
  associate_public_ip_address = true

  key_name = aws_key_pair.bfx_ssh_key.key_name

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(
    local.common_tags,
    { Name = "BFXReportsFrameworkInstance" }
  )
}

data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }

  filter {
    name = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"] # Canonical
}
