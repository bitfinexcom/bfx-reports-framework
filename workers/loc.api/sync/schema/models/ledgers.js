'use strict'

const {
  CONSTR_FIELD_NAME,
  INDEX_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('../const')
const {
  USER_ID_CONSTRAINT,
  SUB_USER_ID_CONSTRAINT
} = require('../common.constraints')

module.exports = {
  _id: ID_PRIMARY_KEY,
  id: 'BIGINT',
  currency: 'VARCHAR(255)',
  mts: 'BIGINT',
  amount: 'DECIMAL(22,12)',
  amountUsd: 'DECIMAL(22,12)',
  exactUsdValue: 'DECIMAL(22,12)',
  balance: 'DECIMAL(22,12)',
  _nativeBalance: 'DECIMAL(22,12)',
  balanceUsd: 'DECIMAL(22,12)',
  _nativeBalanceUsd: 'DECIMAL(22,12)',
  description: 'TEXT',
  wallet: 'VARCHAR(255)',
  _category: 'INT',
  _isMarginFundingPayment: 'INT',
  _isAffiliateRebate: 'INT',
  _isStakingPayments: 'INT',
  _isSubAccountsTransfer: 'INT',
  _isBalanceRecalced: 'INT',
  _isInvoicePayOrder: 'INT',
  _isAirdropOnWallet: 'INT',
  subUserId: 'INT',
  user_id: 'INT NOT NULL',

  [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [INDEX_FIELD_NAME]: [
    ['user_id', 'wallet', 'currency', 'mts'],
    ['user_id', 'wallet', 'mts'],
    ['user_id', 'currency', 'mts'],
    ['user_id', '_isMarginFundingPayment', 'mts'],
    ['user_id', '_isAffiliateRebate', 'mts'],
    ['user_id', '_isStakingPayments', 'mts'],
    ['user_id', '_isSubAccountsTransfer', 'mts'],
    ['user_id', '_category', 'mts'],
    ['user_id', 'mts'],
    ['currency', 'mts'],
    ['_isInvoicePayOrder'],
    ['_isAirdropOnWallet'],
    ['user_id', 'subUserId', 'mts',
      'WHERE subUserId IS NOT NULL'],
    ['subUserId', 'mts', '_id',
      'WHERE subUserId IS NOT NULL']
  ],
  [CONSTR_FIELD_NAME]: [
    USER_ID_CONSTRAINT,
    SUB_USER_ID_CONSTRAINT
  ]
}
