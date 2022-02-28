variable "namespace" {
  type = string
  default = "Custom"
}

variable "vpc_cidr" {
  type = string
  description = "A /16 CIDR range definition, such as 10.11.0.0/16, that the VPC will use"
  default = "10.11.0.0/16"
}

variable "allowed_ports" {
  type = list(number)
  description = "Allowed ports"
  default = []
}

variable "common_tags" {
  type = map
  description = "Common tags"
  default = {}
}
