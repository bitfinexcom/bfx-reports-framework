output bfx_reports_framework_pub_ip {
  value = length(module.app) > 0 ? module.app[0].bfx_reports_framework_pub_ip : null
}

output bfx_reports_framework_pub_dns {
  value = length(module.app) > 0 ? module.app[0].bfx_reports_framework_pub_dns : null
}

output "tf_backend_state_bucket" {
  description = "The S3 bucket to store the remote state file."
  value = length(module.backend) > 0 ? module.backend[0].state_bucket : null
}

output "tf_backend_dynamodb_table_name" {
  description = "The DynamoDB table name to manage lock states."
  value = length(module.backend) > 0 ? module.backend[0].dynamodb_table_name : null
}

output "tf_backend_kms_key" {
  description = "The KMS customer master key to encrypt state buckets."
  value = length(module.backend) > 0 ? module.backend[0].kms_key : null
}
