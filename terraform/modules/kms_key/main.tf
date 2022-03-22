resource "aws_kms_key" "kms_key" {
  description = "General KMS key used for all resources in account"
  customer_master_key_spec = var.customer_master_key_spec
  enable_key_rotation = var.enable_key_rotation
  is_enabled = var.is_enabled
  multi_region = var.multi_region

  policy = data.aws_iam_policy_document.kms_key.json

  tags = merge(
    var.common_tags,
    { Name = "${var.namespace}_KMSKey" }
  )
}

data "aws_iam_policy_document" "kms_key" {
  statement {
    sid = "1"

    principals {
      type = "AWS"
      identifiers = [
        data.aws_caller_identity.current.arn
      ]
    }

    actions = [
      "kms:CreateGrant",
      "kms:Decrypt",
      "kms:Describe*",
      "kms:Encrypt",
      "kms:GenerateDataKey*",
      "kms:ReEncrypt*"
    ]

    resources = [
      "*",
    ]
  }

  statement {

    principals {
      type = "AWS"
      identifiers = [
        data.aws_caller_identity.current.arn
      ]
    }

    actions = [
      "kms:CreateGrant",
    ]

    resources = [
      "*",
    ]

    condition {
      test     = "Bool"
      variable = "kms:GrantIsForAWSResource"

      values = [
        true
      ]
    }
  }

  statement {

    principals {
      type = "AWS"
      identifiers = [
        data.aws_caller_identity.current.arn
      ]
    }

    actions = [
      "kms:Create*",
      "kms:Describe*",
      "kms:Enable*",
      "kms:List*",
      "kms:Put*",
      "kms:Update*",
      "kms:Revoke*",
      "kms:Disable*",
      "kms:Get*",
      "kms:Delete*",
      "kms:ScheduleKeyDeletion",
      "kms:CancelKeyDeletion"
    ]

    resources = [
      "*",
    ]
  }
}

# TODO: move to upper main.tf
data "aws_caller_identity" "current" {}
