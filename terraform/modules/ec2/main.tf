locals {
  availability_zone = length(regexall("^[a-z]{2}-", var.az)) > 0 ? var.az : null
}

resource "aws_instance" "ubuntu" {
  ami = data.aws_ami.ubuntu.id
  instance_type = var.aws_instance_type
  monitoring = var.aws_instance_detailed_mon

  user_data = var.user_data

  availability_zone = local.availability_zone
  vpc_security_group_ids = var.sec_gr_ids
  subnet_id = var.subnet_id
  associate_public_ip_address = true

  key_name = var.key_name

  tags = merge(
    var.common_tags,
    { Name = "${var.namespace}_Instance" }
  )
}

resource "null_resource" "deploy" {
  triggers = {
    version = var.update_version
  }

  connection {
    type = "ssh"
    host = aws_instance.ubuntu.public_ip
    user = var.user_name
    port = 22
    private_key = var.private_key
    agent = true
  }

  provisioner "remote-exec" {
    inline = [
      "if [ -f \"${var.root_dir}/READY\" ]; then sudo \"${var.root_dir}/scripts/deploy.sh\"; fi"
    ]
  }
}

resource "aws_ebs_volume" "ebs-volume-1" {
  availability_zone = local.availability_zone
  size = var.db_volume_size
  type = var.db_volume_type
  encrypted = var.is_db_volume_encrypted

  tags = merge(
    var.common_tags,
    { Name = "${var.namespace}_Volume" }
  )
}

resource "aws_volume_attachment" "ebs-volume-1-attachment" {
  device_name = var.db_volume_device_name
  volume_id = aws_ebs_volume.ebs-volume-1.id
  instance_id = aws_instance.ubuntu.id
  skip_destroy = false
  stop_instance_before_detaching = true
  force_detach = true
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
