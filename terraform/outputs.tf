output bfx_reports_framework_pub_ip {
  value = aws_instance.bfx_reports_framework_ubuntu.public_ip
}

output bfx_reports_framework_pub_dns {
  value = aws_instance.bfx_reports_framework_ubuntu.public_dns
}
