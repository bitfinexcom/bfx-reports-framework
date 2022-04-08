module "vpc" {
  # https://github.com/terraform-aws-modules/terraform-aws-vpc
  source = "terraform-aws-modules/vpc/aws"
  version = "3.13.0"

  name = "${var.namespace}_VPC"
  cidr = var.vpc_cidr

  azs = var.azs
  private_subnets = [cidrsubnet(var.vpc_cidr, 8, 1), cidrsubnet(var.vpc_cidr, 8, 2)]
  public_subnets = [cidrsubnet(var.vpc_cidr, 8, 101), cidrsubnet(var.vpc_cidr, 8, 102)]

  enable_nat_gateway = true
  single_nat_gateway = true
  one_nat_gateway_per_az = false
  reuse_nat_ips = true
  external_nat_ip_ids = aws_eip.nat_eip.*.id

  enable_dns_hostnames = true
  enable_dns_support = true

  tags = merge(
    var.common_tags,
    { Name = "${var.namespace}_VPC" }
  )
}

resource "aws_eip" "nat_eip" {
  vpc = true

  tags = merge(
    var.common_tags,
    { Name = "${var.namespace}_NAT_EIP" }
  )
}

resource "aws_eip" "instance" {
  vpc = true

  tags = merge(
    var.common_tags,
    { Name = "${var.namespace}_Instance_EIP" }
  )
}

resource "aws_security_group" "sec_gr_pub" {
  name = "${var.namespace}_SecurityGroup"
  description = "Allow traffic"
  vpc_id = module.vpc.vpc_id

  dynamic "ingress" {
    for_each = var.allowed_ports
    content {
      from_port = ingress.value
      to_port = ingress.value
      protocol = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.common_tags,
    { Name = "${var.namespace}_SecurityGroup" }
  )
}
