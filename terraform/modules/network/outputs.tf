output "vpc" {
  value = module.vpc
}

output "sec_gr_pub_id" {
  value = aws_security_group.sec_gr_pub.id
}

output "nat_eip" {
  value = aws_eip.nat_eip
}

output "instance_eip" {
  value = aws_eip.instance
}
