variable "namespace" {
  type = string
  default = "Custom"
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

variable "name" {
  type = string
  description = "Secure param name"
  default = "sec_string"
}

variable "length" {
  type = number
  description = "Secure param length"
  default = 16
}

variable "special" {
  type = bool
  description = "Should secure param contain special characters?"
  default = false
}

variable "number" {
  type = bool
  description = "Should secure param contain number?"
  default = true
}

variable "lower" {
  type = bool
  description = "Should secure param contain lower characters?"
  default = true
}

variable "upper" {
  type = bool
  description = "Should secure param contain upper characters?"
  default = false
}

variable "common_tags" {
  type = map
  description = "Common tags"
  default = {}
}
