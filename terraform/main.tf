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
  common_tags = local.common_tags
  allowed_ports = var.allowed_ports
}

module "ec2" {
  source = "./modules/ec2"
  namespace = var.namespace
  aws_instance_type = var.aws_instance_type
  aws_instance_detailed_mon = var.aws_instance_detailed_mon
  sec_gr_ids = [module.network.sec_gr_pub_id]
  subnet_id = module.network.vpc.public_subnets[0]
  update_version = var.update_version
  key_name = var.key_name

  user_data = templatefile("setup.sh.tpl", {
    env = var.env
    nginx_autoindex = var.nginx_autoindex
    repo_fork = var.repo_fork
    repo_branch = var.repo_branch
    nginx_port = var.nginx_port
    nginx_host = module.network.public_dns
    secret_key = var.secret_key # TODO: AWS SSM Parameter Store
  })

  common_tags = local.common_tags
}

resource "tls_private_key" "key" {
  algorithm = "RSA"
}

resource "local_file" "private_key" {
  filename          = "${var.key_name}.pem"
  sensitive_content = tls_private_key.key.private_key_pem
  file_permission   = "0400"
}

resource "aws_key_pair" "key_pair" {
  key_name   = var.key_name
  public_key = tls_private_key.key.public_key_openssh
}
