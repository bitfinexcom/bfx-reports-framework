variable "aws_access_key" {
  type = string
  description = "AWS Access Key ID"
  sensitive = true
}
variable "aws_secret_key" {
  type = string
  description = "AWS Secret Access Key"
  sensitive = true
}
variable "aws_region" {
  type = string
  description = "AWS region"
  default = "eu-central-1"
}

terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "~> 4.1.0"
    }
  }

  required_version = ">= 1.1.5"
}

provider "aws" {
  profile = "default"
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
  region = var.aws_region
}

resource "aws_instance" "bfx_reports_framework_ubuntu" {
  ami = data.aws_ami.ubuntu.id
  instance_type = "t2.medium"
  monitoring = true

  vpc_security_group_ids = [aws_security_group.bfx_sec_gr.id]
  private_ip = "179.16.10.100"
  subnet_id = aws_subnet.bfx_subnet.id

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "BFXReportsFrameworkInstance"
  }
}

resource "aws_eip" "bfx_reports_framework_eip" {
  vpc = true
  instance = aws_instance.bfx_reports_framework_ubuntu.id
  associate_with_private_ip = aws_instance.bfx_reports_framework_ubuntu.private_ip

  depends_on = [aws_internet_gateway.bfx_gw]

  tags = {
    Name = "BFXReportsFrameworkEIP"
  }
}

resource "aws_security_group" "bfx_sec_gr" {
  name = "BFXSecurityGroup"
  description = "Allow traffic"
  vpc_id = aws_vpc.bfx_vpc.id

  dynamic "ingress" {
    for_each = [80, 443]
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

  tags = {
    Name = "BFXSecurityGroup"
  }
}

resource "aws_vpc" "bfx_vpc" {
  cidr_block = "179.16.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "BFX_VPC"
  }
}

resource "aws_internet_gateway" "bfx_gw" {
  vpc_id = aws_vpc.bfx_vpc.id

  tags = {
    Name = "BFXGateway"
  }
}

resource "aws_subnet" "bfx_subnet" {
  vpc_id = aws_vpc.bfx_vpc.id
  cidr_block = "179.16.10.0/24"
  map_public_ip_on_launch = true

  depends_on = [aws_internet_gateway.bfx_gw]

  tags = {
    Name = "BFXSubnet"
  }
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

output bfx_reports_framework_pub_ip {
  value       = aws_eip.bfx_reports_framework_eip.public_ip
}
output bfx_reports_framework_pub_dns {
  value       = aws_eip.bfx_reports_framework_eip.public_dns
}
