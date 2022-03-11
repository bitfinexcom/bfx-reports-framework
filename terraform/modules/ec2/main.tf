resource "aws_instance" "ubuntu" {
  ami = data.aws_ami.ubuntu.id
  instance_type = var.aws_instance_type
  monitoring = var.aws_instance_detailed_mon

  user_data = var.user_data

  vpc_security_group_ids = var.sec_gr_ids
  subnet_id = var.subnet_id
  associate_public_ip_address = true

  key_name = var.key_name

  lifecycle {
    create_before_destroy = true
  }

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
    user = "ubuntu"
    port = 22
    private_key = var.private_key
    agent = true
  }

  # TODO: need to pass home dir from main entrypoint
  provisioner "remote-exec" {
    inline = [
      "sudo /home/ubuntu/bfx-reports-framework/scripts/deploy.sh"
    ]

    on_failure = continue
  }
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
