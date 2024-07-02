'use strict'

/*
 * CREATED_AT: 2024-05-22T13:39:12.034Z
 * VERSION: v41
 */

const {
  ID_PRIMARY_KEY
} = require('./helpers/const')
const {
  getSqlArrToModifyColumns
} = require('./helpers')

const AbstractMigration = require('./abstract.migration')

class MigrationV41 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE ledgers ADD COLUMN exactUsdValue DECIMAL(22,12)',
      'ALTER TABLE trades ADD COLUMN exactUsdValue DECIMAL(22,12)',
      'ALTER TABLE movements ADD COLUMN exactUsdValue DECIMAL(22,12)',

      'ALTER TABLE ledgers ADD COLUMN _isInvoicePayOrder INT',
      `UPDATE ledgers SET _isInvoicePayOrder = (
        SELECT 1 FROM (
          SELECT * FROM ledgers AS l
          WHERE l.description COLLATE NOCASE LIKE '%InvoicePay Order%'
            AND l._id = ledgers._id
        )
      )`,

      'ALTER TABLE ledgers ADD COLUMN _isAirdropOnWallet INT',
      `UPDATE ledgers SET _isAirdropOnWallet = (
        SELECT 1 FROM (
          SELECT * FROM ledgers AS l
          WHERE l.description COLLATE NOCASE LIKE '%Airdrop on wallet%'
            AND l._id = ledgers._id
        )
      )`,

      'ALTER TABLE trades ADD COLUMN _isExchange INT',
      `UPDATE trades SET _isExchange = (
        SELECT 1 FROM (
          SELECT * FROM trades AS t
          WHERE t.orderType COLLATE NOCASE LIKE '%EXCHANGE%'
            AND t._id = trades._id
        )
      )`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      ...getSqlArrToModifyColumns(
        'ledgers',
        {
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
          subUserId: 'INT',
          user_id: 'INT NOT NULL'
        }
      ),

      ...getSqlArrToModifyColumns(
        'trades',
        {
          _id: ID_PRIMARY_KEY,
          id: 'BIGINT',
          symbol: 'VARCHAR(255)',
          mtsCreate: 'BIGINT',
          orderID: 'BIGINT',
          execAmount: 'DECIMAL(22,12)',
          execPrice: 'DECIMAL(22,12)',
          exactUsdValue: 'DECIMAL(22,12)',
          orderType: 'VARCHAR(255)',
          orderPrice: 'DECIMAL(22,12)',
          maker: 'INT',
          fee: 'DECIMAL(22,12)',
          feeCurrency: 'VARCHAR(255)',
          subUserId: 'INT',
          user_id: 'INT NOT NULL'
        }
      ),

      ...getSqlArrToModifyColumns(
        'movements',
        {
          _id: ID_PRIMARY_KEY,
          id: 'BIGINT',
          currency: 'VARCHAR(255)',
          currencyName: 'VARCHAR(255)',
          mtsStarted: 'BIGINT',
          mtsUpdated: 'BIGINT',
          status: 'VARCHAR(255)',
          amount: 'DECIMAL(22,12)',
          amountUsd: 'DECIMAL(22,12)',
          exactUsdValue: 'DECIMAL(22,12)',
          fees: 'DECIMAL(22,12)',
          destinationAddress: 'VARCHAR(255)',
          transactionId: 'VARCHAR(255)',
          note: 'TEXT',
          subUserId: 'INT',
          user_id: 'INT NOT NULL'
        }
      )
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  beforeDown () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  afterDown () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV41
