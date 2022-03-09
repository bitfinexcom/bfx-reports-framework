output bfx_reports_framework_pub_ip {
  value = module.ec2.instance_pub_ip
}

output bfx_reports_framework_pub_dns {
  value = module.ec2.instance_pub_dns
}
