output bfx_reports_framework_pub_ip {
  value = module.network.instance_eip.public_ip
}

output bfx_reports_framework_pub_dns {
  value = module.network.instance_eip.public_dns
}

output "kms_key" {
  description = "The KMS customer master key to encrypt state buckets."
  value = module.backend.kms_key
}

output "state_bucket" {
  description = "The S3 bucket to store the remote state file."
  value = module.backend.state_bucket
}

output "dynamodb_table_name" {
  description = "The DynamoDB table name to manage lock states."
  value = module.backend.dynamodb_table_name
}
