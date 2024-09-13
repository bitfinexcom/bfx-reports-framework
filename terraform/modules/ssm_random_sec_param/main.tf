resource "random_password" "sec_string" {
  length = var.length
  special = var.special
  numeric = var.number
  lower = var.lower
  upper = var.upper
}

resource "aws_ssm_parameter" "sec_string" {
  name = "/${var.env}/${var.namespace}/${var.name}"
  description = "SSM secure string ${var.name}"
  type = "SecureString"
  value = random_password.sec_string.result
  overwrite = false

  tags = merge(
    var.common_tags,
    { Name = "${var.namespace}_${var.name}" }
  )

  lifecycle {
    ignore_changes = [
      name
    ]
  }
}

data "aws_ssm_parameter" "sec_string" {
  name = "/${var.env}/${var.namespace}/${var.name}"

  depends_on = [aws_ssm_parameter.sec_string]
}
