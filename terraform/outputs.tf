output bfx_reports_framework_pub_ip {
  value = module.network.instance_eip.public_ip
}

output bfx_reports_framework_pub_dns {
  value = module.network.instance_eip.public_dns
}
