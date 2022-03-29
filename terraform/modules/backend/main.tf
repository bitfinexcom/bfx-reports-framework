module "remote_state" {
  source = "nozaq/remote-state-s3-backend/aws"
  version = "1.1.2"

  terraform_iam_policy_create = true
  enable_replication = var.is_backend_s3_replication_enabled
  s3_bucket_force_destroy = var.is_backend_s3_bucket_force_destroyed
  dynamodb_table_name = var.tf_lock_dynamodb_table_name
  replica_bucket_prefix = "terraform-state-bucket-replica-"
  state_bucket_prefix = "terraform-state-bucket-"

  providers = {
    aws = aws
    aws.replica = aws.replica
  }

  tags = merge(
    var.common_tags,
    { Name = "${var.namespace}_TF_Backend" }
  )
}

resource "local_file" "backend_conf" {
  filename = "config/backend.conf"

  content = <<EOF
bucket="${module.remote_state.state_bucket.bucket}"
kms_key_id="${module.remote_state.kms_key.key_id}"

key="states/bfx-reports-framework.tfstate"
dynamodb_table="${module.remote_state.dynamodb_table.name}"
encrypt=true

shared_credentials_file = "config/credentials.conf"
profile = "default"
region="${data.aws_region.current.name}"
EOF
  file_permission = "0766"

  depends_on = [module.remote_state]
}

resource "local_file" "backend_tf" {
  filename = "backend.tf"

  content = <<EOF
terraform {
  backend "s3" {}
}
EOF

  file_permission = "0766"

  depends_on = [module.remote_state]
}

resource "aws_iam_user" "terraform" {
  name = "TerraformUser"
}

resource "aws_iam_user_policy_attachment" "backend_access" {
  user = aws_iam_user.terraform.name
  policy_arn = module.remote_state.terraform_iam_policy.arn
}

data "aws_region" "current" {}
