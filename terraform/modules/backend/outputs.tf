output "state_bucket" {
  description = "The S3 bucket to store the remote state file."
  value = module.remote_state.state_bucket.bucket
}

output "dynamodb_table_name" {
  description = "The DynamoDB table name to manage lock states."
  value = module.remote_state.dynamodb_table.name
}

output "kms_key" {
  description = "The KMS customer master key to encrypt state buckets."
  value = module.remote_state.kms_key.key_id
}
