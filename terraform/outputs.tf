output bfx_reports_framework_pub_ip {
  value = aws_eip.bfx_reports_framework_eip.public_ip
}

output bfx_reports_framework_pub_dns {
  value = aws_eip.bfx_reports_framework_eip.public_dns
}
