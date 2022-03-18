variable "namespace" {
  type = string
  default = "Custom"
}

variable "update_version" {
  type = string
  description = "App update version used to launch deploy script, when the version is increased"
  default = "1.0.0"
}

variable "aws_instance_type" {
  type = string
  description = "AWS instance type"
  default = "t2.medium"
}

variable "aws_instance_detailed_mon" {
  type = bool
  description = "AWS instance detailed monitoring"
  default = true
}

variable "user_data" {
  type = string
  description = "Setup bash script"
}

variable "sec_gr_ids" {
  type = list
  description = "AWS security group IDs"
}

variable "az" {
  type = string
  description = "Available zone name in the region"
  default = null
}

variable "subnet_id" {
  type = string
  description = "AWS subnet ID"
}

variable "key_name" {
  type = string
  description = "AWS SSH key name"
  default = "bfx-ssh-key"
}

variable "private_key" {
  type = string
  description = "AWS SSH private key"
  sensitive = true
}

variable "user_name" {
  type = string
  description = "AWS EC2 user name"
  default = "ubuntu"
}

variable "root_dir" {
  type = string
  description = "AWS EC2 root dir"
  default = "project"
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

variable "common_tags" {
  type = map
  description = "Common tags"
  default = {}
}
