'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

class MigrationV26 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE payInvoiceList ADD COLUMN payment INT'
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
  down () {
    const sqlArr = [
      ...getSqlArrToModifyColumns(
        'payInvoiceList',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'VARCHAR(255)',
          t: 'BIGINT',
          duration: 'INT',
          amount: 'DECIMAL(22,12)',
          currency: 'VARCHAR(255)',
          orderId: 'VARCHAR(255)',
          payCurrencies: 'TEXT',
          webhook: 'VARCHAR(255)',
          redirectUrl: 'VARCHAR(255)',
          status: 'VARCHAR(255)',
          customerInfo: 'TEXT',
          invoices: 'TEXT',
          merchantName: 'VARCHAR(255)',
          subUserId: 'INT',
          user_id: 'INT NOT NULL',
          __constraints__: [
            `CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`,
            `CONSTRAINT #{tableName}_fk_subUserId
            FOREIGN KEY (subUserId)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
          ]
        }
      )
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  afterDown () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV26
