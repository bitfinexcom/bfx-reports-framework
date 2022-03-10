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

variable "subnet_id" {
  type = string
  description = "AWS subnet ID"
}

variable "key_name" {
  type = string
  description = "AWS SSH key name"
  default = "bfx-ssh-key"
}

variable "common_tags" {
  type = map
  description = "Common tags"
  default = {}
}
