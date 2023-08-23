'use strict'

/*
 * CREATED_AT: 2023-08-07T08:16:33.087Z
 * VERSION: v37
 */

const {
  ID_PRIMARY_KEY
} = require('./helpers/const')

const AbstractMigration = require('./abstract.migration')

class MigrationV37 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      `CREATE TABLE marginCurrencyList (
        _id ${ID_PRIMARY_KEY},
        symbol VARCHAR(255)
      )`,

      `CREATE UNIQUE INDEX marginCurrencyList_symbol
        ON marginCurrencyList(symbol)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      'DROP TABLE marginCurrencyList',
      `DELETE FROM completedOnFirstSyncColls
        WHERE collName = '_getMarginCurrencyList'`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  before () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  after () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV37
