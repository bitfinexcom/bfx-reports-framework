'use strict'

const Model = require('./model')

module.exports = new Model({
  id: Model.BIGINT,
  currency: Model.VARCHAR,
  mts: Model.BIGINT,
  amount: Model.DECIMAL,
  amountUsd: Model.DECIMAL,
  exactUsdValue: Model.DECIMAL,
  balance: Model.DECIMAL,
  _nativeBalance: Model.DECIMAL,
  balanceUsd: Model.DECIMAL,
  _nativeBalanceUsd: Model.DECIMAL,
  description: Model.TEXT,
  wallet: Model.VARCHAR,
  _category: Model.INTEGER,
  _isMarginFundingPayment: Model.INTEGER,
  _isAffiliateRebate: Model.INTEGER,
  _isStakingPayments: Model.INTEGER,
  _isSubAccountsTransfer: Model.INTEGER,
  _isBalanceRecalced: Model.INTEGER,
  _isInvoicePayOrder: Model.INTEGER,
  _isAirdropOnWallet: Model.INTEGER,
  subUserId: Model.INTEGER,
  user_id: Model.INTEGER_NOT_NULL,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [Model.INDEX_FIELD_NAME]: [
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
  [Model.CONSTR_FIELD_NAME]: [
    Model.COMMON_CONSTRAINTS.USER_ID_CONSTRAINT,
    Model.COMMON_CONSTRAINTS.SUB_USER_ID_CONSTRAINT
  ]
})
