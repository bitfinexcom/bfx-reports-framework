'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

class MigrationV29 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE orders ADD COLUMN routing VARCHAR(255)',
      'ALTER TABLE orders ADD COLUMN meta TEXT',
      'DELETE FROM orders',
      `DELETE FROM completedOnFirstSyncColls
        WHERE collName = '_getOrders'`
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
        'orders',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          gid: 'BIGINT',
          cid: 'BIGINT',
          symbol: 'VARCHAR(255)',
          mtsCreate: 'BIGINT',
          mtsUpdate: 'BIGINT',
          amount: 'DECIMAL(22,12)',
          amountOrig: 'DECIMAL(22,12)',
          type: 'VARCHAR(255)',
          typePrev: 'VARCHAR(255)',
          flags: 'INT',
          status: 'VARCHAR(255)',
          price: 'DECIMAL(22,12)',
          priceAvg: 'DECIMAL(22,12)',
          priceTrailing: 'DECIMAL(22,12)',
          priceAuxLimit: 'DECIMAL(22,12)',
          notify: 'INT',
          placedId: 'BIGINT',
          _lastAmount: 'DECIMAL(22,12)',
          amountExecuted: 'DECIMAL(22,12)',
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

module.exports = MigrationV29
