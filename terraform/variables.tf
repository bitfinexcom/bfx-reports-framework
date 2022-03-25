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

variable "namespace" {
  type = string
  description = "Namespace"
  default = "BFX"
}

variable "key_name" {
  type = string
  description = "AWS SSH key name"
  default = "bfx-ssh-key"
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

variable "db_volume_device_name" {
  type = string
  description = "DB volume device name"
  default = "/dev/xvdf"
}

variable "db_volume_size" {
  type = number
  description = "DB volume size in Gb"
  default = 10
}

variable "db_volume_type" {
  type = string
  description = "DB volume type, see https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume#type"
  default = "gp3"
}

variable "is_db_volume_encrypted" {
  type = bool
  description = "Is DB volume encrypted"
  default = true
}

variable "customer_master_key_spec" {
  type = string
  description = "Key specs for KMS keys"
  default = "SYMMETRIC_DEFAULT"
}

variable "enable_key_rotation" {
  type = bool
  description = "Specifies whether key rotation is enabled, AWS KMS supports automatic key rotation only for symmetric KMS keys"
  default = true
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
