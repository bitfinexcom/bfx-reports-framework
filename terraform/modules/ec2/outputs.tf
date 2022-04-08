output instance_pub_ip {
  value = aws_instance.ubuntu.public_ip
}

output instance_pub_dns {
  value = aws_instance.ubuntu.public_dns
}
