'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

class MigrationV11 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE movements ADD COLUMN note TEXT',
      'DELETE FROM movements',
      `DELETE FROM completedOnFirstSyncColls
        WHERE collName = '_getMovements'`
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
        'movements',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          currency: 'VARCHAR(255)',
          currencyName: 'VARCHAR(255)',
          mtsStarted: 'BIGINT',
          mtsUpdated: 'BIGINT',
          status: 'VARCHAR(255)',
          amount: 'DECIMAL(22,12)',
          amountUsd: 'DECIMAL(22,12)',
          fees: 'DECIMAL(22,12)',
          destinationAddress: 'VARCHAR(255)',
          transactionId: 'VARCHAR(255)',
          note: 'TEXT',
          subUserId: 'INT',
          user_id: 'INT NOT NULL',
          __constraints__: [
            `CONSTRAINT movements_fk_user_id
              FOREIGN KEY (user_id)
              REFERENCES users(_id)
              ON UPDATE CASCADE
              ON DELETE CASCADE`,
            `CONSTRAINT movements_fk_subUserId
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

module.exports = MigrationV11
