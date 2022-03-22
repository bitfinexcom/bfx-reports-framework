variable "namespace" {
  type = string
  default = "Custom"
}

variable "user_arn" {
  type = string
  description = "Amazon Resource Name (ARN) of the current caller"
}

variable "customer_master_key_spec" {
  type = string
  description = "Key specs for KMS keys"
  default = "SYMMETRIC_DEFAULT"
}

variable "enable_key_rotation" {
  type = bool
  description = "Specifies whether key rotation is enabled"
  default = true
}

variable "is_enabled" {
  type = bool
  description = "Specifies whether the key is enabled"
  default = true
}

variable "multi_region" {
  type = bool
  description = "Indicates whether the KMS key is a multi-Region"
  default = false
}

variable "common_tags" {
  type = map
  description = "Common tags"
  default = {}
}
