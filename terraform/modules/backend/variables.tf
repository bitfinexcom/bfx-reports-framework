variable "namespace" {
  type = string
  default = "Custom"
}

variable "is_backend_s3_config_removed" {
  type = bool
  description = "Set this to true to remove S3 backend config."
  default = false
}

variable "is_backend_s3_replication_enabled" {
  type = bool
  description = "Set this to true to enable S3 bucket replication in another region."
  default = false
}

variable "is_backend_s3_bucket_force_destroyed" {
  type = bool
  description = "A boolean that indicates all objects should be deleted from S3 buckets so that the buckets can be destroyed without error. These objects are not recoverable."
  default = true
}

variable "tf_lock_dynamodb_table_name" {
  type = string
  description = "Terraform lock DynamoDB table name"
  default = "tf-remote-state-lock"
}

variable "common_tags" {
  type = map
  description = "Common tags"
  default = {}
}
