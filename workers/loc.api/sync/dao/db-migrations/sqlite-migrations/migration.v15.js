'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

class MigrationV15 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE statusMessages ADD COLUMN clampMin DECIMAL(22,12)',
      'ALTER TABLE statusMessages ADD COLUMN clampMax DECIMAL(22,12)'
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
        'statusMessages',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          key: 'VARCHAR(255)',
          timestamp: 'BIGINT',
          price: 'DECIMAL(22,12)',
          priceSpot: 'DECIMAL(22,12)',
          fundBal: 'DECIMAL(22,12)',
          fundingAccrued: 'DECIMAL(22,12)',
          fundingStep: 'DECIMAL(22,12)',
          _type: 'VARCHAR(255)'
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

module.exports = MigrationV15
