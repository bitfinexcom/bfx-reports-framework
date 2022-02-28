output "vpc" {
  value = module.vpc
}

output "sec_gr_pub_id" {
  value = aws_security_group.sec_gr_pub.id
}

