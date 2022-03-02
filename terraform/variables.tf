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

variable "secret_key" {
  type = string
  description = "Bitfinex Reports Framework Secret Key"
  sensitive = true
}

variable "aws_region" {
  type = string
  description = "AWS region"
  default = "eu-central-1"
}

variable "namespace" {
  type = string
  description = "Namespace"
  default = "BFX"
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

variable "nginx_autoindex" {
  type = string
  description = "NGINX autoindex"
  default = "on"

  validation {
    condition = contains(["on", "off"], var.nginx_autoindex)
    error_message = "The nginx_autoindex value must be one of the following \"on\" or \"off\"."
  }
}

variable "repo_fork" {
  type = string
  description = "Repository fork"
  default = "bitfinexcom"
}

variable "repo_branch" {
  type = string
  description = "Repository branch"
  default = "master"
}


variable "nginx_port" {
  type = number
  description = "NGINX port"
  default = 80
}

variable "aws_instance_type" {
  type = string
  description = "AWS instance type"
  default = "t2.medium"
}

variable "allowed_ports" {
  type = list(number)
  description = "Allowed ports"
  default = [80, 443, 22]
}

variable "aws_instance_detailed_mon" {
  type = bool
  description = "AWS instance detailed monitoring"
  default = true
}

variable "aws_vpc_cidr" {
  type = string
  description = "A /16 CIDR range definition, such as 10.11.0.0/16, that the VPC will use"
  default = "10.11.0.0/16"
}

variable "common_tags" {
  type = map
  description = "Common tags"
  default = {
    Owner = "Bitfinex"
    Project = "bfx-reports-framework"
  }
}
