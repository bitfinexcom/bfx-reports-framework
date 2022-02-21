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

variable "env" {
  type = string
  description = "Environment"
  default = "production"

  validation {
    condition = contains(["production", "development"], var.env)
    error_message = "The env value must be one of the following \"production\" or \"development\"."
  }
}

variable "aws_instance_type" {
  type = string
  description = "AWS instance type"
  # default = "t2.medium"
  default = "t2.micro" # TODO:
}

variable "allowed_ports" {
  type = list(number)
  description = "Allowed ports"
  default = [80, 443]
}

variable "aws_instance_detailed_mon" {
  type = bool
  description = "AWS instance detailed monitoring"
  default = true
}

variable "aws_vpc_cidr" {
  type = string
  description = "A /16 CIDR range definition, such as 179.16.0.0/16, that the VPC will use"
  default = "179.16.0.0/16"
}

variable "common_tags" {
  type = map
  description = "Common tags"
  default = {
    Owner = "Bitfinex"
    Project = "bfx-reports-framework"
  }
}
