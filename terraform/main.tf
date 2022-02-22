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
    nginx_host = aws_eip.bfx_reports_framework_eip.public_dns
    secret_key = var.secret_key # TODO: AWS SSM Parameter Store
  })

  vpc_security_group_ids = [aws_security_group.bfx_sec_gr.id]
  subnet_id = aws_subnet.bfx_subnet.id

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(
    local.common_tags,
    { Name = "BFXReportsFrameworkInstance" }
  )
}

resource "aws_eip_association" "bfx_reports_framework_eip_assoc" {
  instance_id   = aws_instance.bfx_reports_framework_ubuntu.id
  allocation_id = aws_eip.bfx_reports_framework_eip.id
}

resource "aws_eip" "bfx_reports_framework_eip" {
  vpc = true

  depends_on = [aws_internet_gateway.bfx_gw]

  tags = merge(
    local.common_tags,
    { Name = "BFXReportsFrameworkEIP" }
  )
}

resource "aws_security_group" "bfx_sec_gr" {
  name = "BFXSecurityGroup"
  description = "Allow traffic"
  vpc_id = aws_vpc.bfx_vpc.id

  dynamic "ingress" {
    for_each = var.allowed_ports
    content {
      from_port = ingress.value
      to_port = ingress.value
      protocol = "tcp"
      cidr_blocks = [aws_vpc.bfx_vpc.cidr_block]
    }
  }

  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    local.common_tags,
    { Name = "BFXSecurityGroup" }
  )
}

resource "aws_vpc" "bfx_vpc" {
  cidr_block = var.aws_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support = true

  tags = merge(
    local.common_tags,
    { Name = "BFX_VPC" }
  )
}

resource "aws_internet_gateway" "bfx_gw" {
  vpc_id = aws_vpc.bfx_vpc.id

  tags = merge(
    local.common_tags,
    { Name = "BFXGateway" }
  )
}

resource "aws_subnet" "bfx_subnet" {
  vpc_id = aws_vpc.bfx_vpc.id
  cidr_block = cidrsubnet(aws_vpc.bfx_vpc.cidr_block, 8, 10)
  map_public_ip_on_launch = true

  depends_on = [aws_internet_gateway.bfx_gw]

  tags = merge(
    local.common_tags,
    { Name = "BFXSubnet" }
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
