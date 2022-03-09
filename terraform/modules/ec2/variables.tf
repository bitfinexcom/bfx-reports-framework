variable "namespace" {
  type = string
  default = "Custom"
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

variable "sec_gr_pub_id" {
  type = string
  description = "AWS security group ID"
}

variable "subnet_id" {
  type = string
  description = "AWS subnet ID"
}

variable "key_name" {
  type = string
  description = "AWS SSH key name"
}


variable "common_tags" {
  type = map
  description = "Common tags"
  default = {}
}
