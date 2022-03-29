provider "aws" {
  shared_credentials_files = ["config/credentials.conf"]
  profile = "default"
  region = var.aws_region
}

provider "aws" {
  alias  = "replica"
  shared_credentials_files = ["config/credentials.conf"]
  profile = "default"
  region = var.aws_replica_region
}
