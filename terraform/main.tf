locals {
  common_tags = merge(
    var.common_tags,
    { Environment = var.env }
  )

  ec2_user_name = "ubuntu"
  ec2_root_dir = "/home/${local.ec2_user_name}/bfx-reports-framework"
}

module "network" {
  source = "./modules/network"
  namespace = var.namespace
  vpc_cidr = var.aws_vpc_cidr
  common_tags = local.common_tags
  allowed_ports = var.allowed_ports
  azs = data.aws_availability_zones.available.names
}

module "ec2" {
  source = "./modules/ec2"
  ssh_connect_script_name = "worker-connect.sh"
  namespace = var.namespace
  aws_instance_type = var.aws_instance_type
  aws_instance_detailed_mon = var.aws_instance_detailed_mon
  sec_gr_ids = [module.network.sec_gr_pub_id]
  subnet_id = module.network.vpc.public_subnets[0]
  update_version = var.update_version
  key_name = module.ssh_key.key_name
  private_key = module.ssh_key.private_key
  user_name = local.ec2_user_name
  root_dir = local.ec2_root_dir
  az = data.aws_availability_zones.available.names[0]
  db_volume_device_name = var.db_volume_device_name
  db_volume_size = var.db_volume_size
  db_volume_type = var.db_volume_type
  is_db_volume_encrypted = var.is_db_volume_encrypted
  kms_key_arn = module.kms_key.kms_key_arn
  secret_key = module.ssm_param_secret_key.sec_string
  aws_eip_id = module.network.instance_eip.id

  user_data = templatefile("setup.sh.tpl", {
    user_name = local.ec2_user_name
    root_dir = local.ec2_root_dir
    env = var.env
    nginx_autoindex = var.nginx_autoindex
    repo_fork = var.repo_fork
    repo_branch = var.repo_branch
    nginx_port = var.nginx_port
    nginx_host = module.network.instance_eip.public_dns
    db_volume_device_name = var.db_volume_device_name
  })

  common_tags = local.common_tags
}

module "ssh_key" {
  source = "./modules/ssh_key"
  key_name = var.key_name
}

module "kms_key" {
  source = "./modules/kms_key"
  namespace = var.namespace
  customer_master_key_spec = var.customer_master_key_spec
  # AWS KMS supports automatic key rotation only for symmetric KMS keys
  # https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
  enable_key_rotation = var.enable_key_rotation
  user_arn = data.aws_caller_identity.current.arn

  common_tags = local.common_tags
}

module "ssm_param_secret_key" {
  source = "./modules/ssm_random_sec_param"
  namespace = var.namespace
  env = var.env
  name = "secret_key"
  length = 512
  common_tags = local.common_tags
}

data "aws_availability_zones" "available" {}
data "aws_caller_identity" "current" {}
