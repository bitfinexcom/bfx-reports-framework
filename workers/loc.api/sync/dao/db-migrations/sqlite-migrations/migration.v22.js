'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

class MigrationV22 extends AbstractMigration {
  /**
   * @override
   */
  before () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  up () {
    const sqlArr = [
      'DROP INDEX IF EXISTS completedOnFirstSyncColls_collName_user_id',

      'ALTER TABLE completedOnFirstSyncColls ADD COLUMN mts BIGINT',
      'ALTER TABLE completedOnFirstSyncColls ADD COLUMN subUserId INT',

      ...getSqlArrToModifyColumns(
        'completedOnFirstSyncColls',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          collName: 'VARCHAR(255) NOT NULL',
          mts: 'BIGINT',
          subUserId: 'INT',
          user_id: 'INT',
          __constraints__: [
            `CONSTRAINT completedOnFirstSyncColls_fk_user_id
              FOREIGN KEY (user_id)
              REFERENCES users(_id)
              ON UPDATE CASCADE
              ON DELETE CASCADE`,
            `CONSTRAINT completedOnFirstSyncColls_fk_subUserId
              FOREIGN KEY (subUserId)
              REFERENCES users(_id)
              ON UPDATE CASCADE
              ON DELETE CASCADE`
          ]
        }
      ),

      `CREATE UNIQUE INDEX completedOnFirstSyncColls_collName
        ON completedOnFirstSyncColls (collName)
        WHERE user_id IS NULL`,
      `CREATE UNIQUE INDEX completedOnFirstSyncColls_user_id_collName
        ON completedOnFirstSyncColls (user_id, collName)
        WHERE user_id IS NOT NULL AND subUserId IS NULL`,
      `CREATE UNIQUE INDEX completedOnFirstSyncColls_user_id_subUserId_collName
        ON completedOnFirstSyncColls (user_id, subUserId, collName)
        WHERE user_id IS NOT NULL AND subUserId IS NOT NULL`,

      // Delete old sub-account entries
      `DELETE FROM completedOnFirstSyncColls
        WHERE user_id IN (SELECT _id FROM users WHERE isSubAccount = 1)`,

      // Add fresh sub-account entries
      `INSERT OR REPLACE INTO completedOnFirstSyncColls
        (collName, subUserId, user_id)
        SELECT * FROM (
          SELECT '_getLedgers' AS collName, subUserId, user_id FROM ledgers UNION
          SELECT '_getTrades' AS collName, subUserId, user_id FROM trades UNION
          SELECT '_getFundingTrades' AS collName, subUserId, user_id FROM fundingTrades UNION
          SELECT '_getOrders' AS collName, subUserId, user_id FROM orders UNION
          SELECT '_getMovements' AS collName, subUserId, user_id FROM movements UNION
          SELECT '_getFundingOfferHistory' AS collName, subUserId, user_id FROM fundingOfferHistory UNION
          SELECT '_getFundingLoanHistory' AS collName, subUserId, user_id FROM fundingLoanHistory UNION
          SELECT '_getFundingCreditHistory' AS collName, subUserId, user_id FROM fundingCreditHistory UNION
          SELECT '_getPositionsHistory' AS collName, subUserId, user_id FROM positionsHistory UNION
          SELECT '_getPositionsSnapshot' AS collName, subUserId, user_id FROM positionsSnapshot UNION
          SELECT '_getLogins' AS collName, subUserId, user_id FROM logins UNION
          SELECT '_getChangeLogs' AS collName, subUserId, user_id FROM changeLogs
        ) WHERE subUserId IS NOT NULL`,

      // Add public collections entries
      `INSERT OR REPLACE INTO completedOnFirstSyncColls
        (collName)
        SELECT '_getSymbols' AS collName FROM symbols UNION
        SELECT '_getMapSymbols' AS collName FROM mapSymbols UNION
        SELECT '_getInactiveCurrencies' AS collName FROM inactiveCurrencies UNION
        SELECT '_getInactiveSymbols' AS collName FROM inactiveSymbols UNION
        SELECT '_getFutures' AS collName FROM futures UNION
        SELECT '_getCurrencies' AS collName FROM currencies UNION
        SELECT '_getCandles' AS collName FROM candles`,

      // Update private collections
      // Get mts from ledgers or logins to have
      // an approximate last sync start-up time
      `UPDATE completedOnFirstSyncColls AS cs SET mts = (
        SELECT max(mts) FROM (
          SELECT user_id, mts FROM ledgers
            UNION SELECT user_id, time AS mts FROM logins
        ) AS un
          WHERE un.user_id = cs.user_id
      )`,

      // Update public collections
      // Get mts from ledgers or logins to have
      // an approximate last sync start-up time
      `UPDATE completedOnFirstSyncColls AS cs SET mts = (
        SELECT max(mts) FROM (
          SELECT mts FROM ledgers
            UNION SELECT time AS mts FROM logins
        ) 
      ) WHERE cs.user_id IS NULL`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      'DROP INDEX IF EXISTS completedOnFirstSyncColls_collName',
      'DROP INDEX IF EXISTS completedOnFirstSyncColls_user_id_collName',
      'DROP INDEX IF EXISTS completedOnFirstSyncColls_user_id_subUserId_collName',

      ...getSqlArrToModifyColumns(
        'completedOnFirstSyncColls',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          collName: 'VARCHAR(255)',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT completedOnFirstSyncColls_fk_user_id
            FOREIGN KEY(user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),

      `CREATE UNIQUE INDEX completedOnFirstSyncColls_collName_user_id
        ON completedOnFirstSyncColls (collName, user_id)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  after () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV22
