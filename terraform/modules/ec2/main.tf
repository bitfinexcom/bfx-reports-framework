locals {
  availability_zone = length(regexall("^[a-z]{2}-", var.az)) > 0 ? var.az : null
  secret_key = nonsensitive(var.secret_key)
}

resource "aws_instance" "ubuntu" {
  ami = data.aws_ami.ubuntu.id
  instance_type = var.aws_instance_type
  monitoring = var.aws_instance_detailed_mon

  user_data = var.user_data

  availability_zone = local.availability_zone
  vpc_security_group_ids = var.sec_gr_ids
  subnet_id = var.subnet_id

  key_name = var.key_name

  tags = merge(
    var.common_tags,
    { Name = "${var.namespace}_Instance" }
  )
}

resource "local_sensitive_file" "private_key" {
  filename = "${var.ssh_connect_script_name}"

  content = <<EOF
#!/bin/bash

set -euxo pipefail

ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "${var.key_name}.pem" ${var.user_name}@${aws_instance.ubuntu.public_dns}
EOF

  file_permission = "0754"
}

resource "null_resource" "deploy" {
  triggers = {
    version = timestamp()
  }

  connection {
    type = "ssh"
    host = aws_eip_association.eip_assoc.public_ip
    user = var.user_name
    port = 22
    private_key = var.private_key
    agent = true
  }

  provisioner "remote-exec" {
    inline = [
      "echo \"Waiting for cloud-init...\"",
      "cloud-init status --wait > /dev/null 2>&1",
      "if [ -f \"${var.root_dir}/READY\" ]; then sudo \"${var.root_dir}/scripts/deploy.sh\" SECRET_KEY=${local.secret_key}; fi",
      "if ! [ -f \"${var.root_dir}/READY\" ]; then echo \"The bash setup script has not been finished successfully!\"; fi"
    ]
  }
}

resource "aws_ebs_volume" "ebs_volume_1" {
  availability_zone = local.availability_zone
  size = var.db_volume_size
  type = var.db_volume_type
  encrypted = var.is_db_volume_encrypted
  kms_key_id = var.is_db_volume_encrypted ? var.kms_key_arn : null

  tags = merge(
    var.common_tags,
    { Name = "${var.namespace}_Volume" }
  )
}

resource "aws_volume_attachment" "ebs_volume_1_attachment" {
  device_name = var.db_volume_device_name
  volume_id = aws_ebs_volume.ebs_volume_1.id
  instance_id = aws_instance.ubuntu.id
  skip_destroy = false
  stop_instance_before_detaching = true
  force_detach = true
}

resource "aws_eip_association" "eip_assoc" {
  instance_id = aws_instance.ubuntu.id
  allocation_id = var.aws_eip_id
}

data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }

  filter {
    name = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"] # Canonical
}
