locals {
  common_tags = merge(
    var.common_tags,
    {
      Namespace = var.namespace,
      Workspace = terraform.workspace,
      Environment = var.env
    }
  )
}

module "app" {
  source = "./modules/app"

  count = var.is_app_enabled ? 1 : 0

  namespace = var.namespace
  env = var.env
  aws_instance_type = var.aws_instance_type
  aws_instance_detailed_mon = var.aws_instance_detailed_mon

  db_volume_device_name = var.db_volume_device_name
  db_volume_size = var.db_volume_size
  db_volume_type = var.db_volume_type
  is_db_volume_encrypted = var.is_db_volume_encrypted

  repo_fork = var.repo_fork
  repo_branch = var.repo_branch
  nginx_autoindex = var.nginx_autoindex
  nginx_port = var.nginx_port

  aws_vpc_cidr = var.aws_vpc_cidr
  allowed_ports = var.allowed_ports

  key_name = var.key_name

  # AWS KMS supports automatic key rotation only for symmetric KMS keys
  # https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
  customer_master_key_spec = var.customer_master_key_spec
  enable_key_rotation = var.enable_key_rotation

  common_tags = local.common_tags
}

module "backend" {
  source = "./modules/backend"

  count = var.is_backend_s3_enabled ? 1 : 0

  providers = {
    aws = aws
    aws.replica = aws.replica
  }

  namespace = var.namespace
  is_backend_s3_config_removed = var.is_backend_s3_config_removed
  is_backend_s3_replication_enabled = var.is_backend_s3_replication_enabled
  is_backend_s3_bucket_force_destroyed = var.is_backend_s3_bucket_force_destroyed
  tf_lock_dynamodb_table_name = var.tf_lock_dynamodb_table_name
  common_tags = local.common_tags
}
