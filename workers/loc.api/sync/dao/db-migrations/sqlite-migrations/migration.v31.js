'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

const {
  CONSTR_FIELD_NAME,
  TRIGGER_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('./helpers/const')

const CREATE_UPDATE_MTS_TRIGGERS = [
  `insert_#{tableName}_createdAt_and_updatedAt
    AFTER INSERT ON #{tableName}
    FOR EACH ROW
    BEGIN
      UPDATE #{tableName}
        SET createdAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT),
          updatedAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT)
        WHERE _id = NEW._id;
    END`,
  `update_#{tableName}_updatedAt
    AFTER UPDATE ON #{tableName}
    FOR EACH ROW
    BEGIN
      UPDATE #{tableName}
        SET updatedAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT)
        WHERE _id = NEW._id;
    END`
]
const QUERY_TO_SET_FRESH_MTS = `UPDATE #{tableName}
SET createdAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT),
  updatedAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT)`
const QUERIES_TO_DELETE_DATA = [
  'DELETE FROM ledgers',
  'DELETE FROM trades',
  'DELETE FROM fundingTrades',
  'DELETE FROM publicTrades',
  'DELETE FROM orders',
  'DELETE FROM movements',
  'DELETE FROM fundingOfferHistory',
  'DELETE FROM fundingLoanHistory',
  'DELETE FROM fundingCreditHistory',
  'DELETE FROM positionsHistory',
  'DELETE FROM positionsSnapshot',
  'DELETE FROM logins',
  'DELETE FROM changeLogs',
  'DELETE FROM payInvoiceList',
  'DELETE FROM tickersHistory',
  'DELETE FROM statusMessages',
  'DELETE FROM symbols',
  'DELETE FROM mapSymbols',
  'DELETE FROM inactiveCurrencies',
  'DELETE FROM inactiveSymbols',
  'DELETE FROM futures',
  'DELETE FROM currencies',
  'DELETE FROM candles'
]
const QUERY_TO_SET_INITIAL_SYNC_PROGRESS_STATE = `\
UPDATE progress
  SET value = 'SYNCHRONIZATION_HAS_NOT_STARTED_YET'`

const _replacePlaceholder = (sql, tableName) => {
  return sql.replace(/#{tableName\}/g, tableName)
}

const _getCreateUpdateMtsTriggers = (tableName) => {
  return CREATE_UPDATE_MTS_TRIGGERS.map((item) => {
    const sql = _replacePlaceholder(item, tableName)

    return `CREATE TRIGGER IF NOT EXISTS ${sql}`
  })
}

const _getQueryToSetFreshMts = (tableName) => {
  return _replacePlaceholder(
    QUERY_TO_SET_FRESH_MTS,
    tableName
  )
}

class MigrationV31 extends AbstractMigration {
  /**
   * @override
   */
  before () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE users ADD COLUMN createdAt BIGINT',
      'ALTER TABLE users ADD COLUMN updatedAt BIGINT',
      ..._getCreateUpdateMtsTriggers('users'),
      _getQueryToSetFreshMts('users'),

      'ALTER TABLE subAccounts ADD COLUMN createdAt BIGINT',
      'ALTER TABLE subAccounts ADD COLUMN updatedAt BIGINT',
      ..._getCreateUpdateMtsTriggers('subAccounts'),
      _getQueryToSetFreshMts('subAccounts'),

      'DROP INDEX IF EXISTS statusMessages_timestamp_key__type',
      'DROP INDEX IF EXISTS mapSymbols_key_value',

      'ALTER TABLE publicСollsСonf ADD COLUMN createdAt BIGINT',
      'ALTER TABLE publicСollsСonf ADD COLUMN updatedAt BIGINT',
      ..._getCreateUpdateMtsTriggers('publicСollsСonf'),
      _getQueryToSetFreshMts('publicСollsСonf'),

      'ALTER TABLE scheduler ADD COLUMN createdAt BIGINT',
      'ALTER TABLE scheduler ADD COLUMN updatedAt BIGINT',
      ..._getCreateUpdateMtsTriggers('scheduler'),
      _getQueryToSetFreshMts('scheduler'),

      'ALTER TABLE syncMode ADD COLUMN createdAt BIGINT',
      'ALTER TABLE syncMode ADD COLUMN updatedAt BIGINT',
      ..._getCreateUpdateMtsTriggers('syncMode'),
      _getQueryToSetFreshMts('syncMode'),

      'ALTER TABLE progress ADD COLUMN createdAt BIGINT',
      'ALTER TABLE progress ADD COLUMN updatedAt BIGINT',
      ..._getCreateUpdateMtsTriggers('progress'),
      _getQueryToSetFreshMts('progress'),

      'DROP TABLE IF EXISTS syncQueue',
      `CREATE TABLE syncQueue (
        _id ${ID_PRIMARY_KEY},
        collName VARCHAR(255) NOT NULL,
        state VARCHAR(255),
        createdAt BIGINT,
        updatedAt BIGINT,
        ownerUserId INT,
        isOwnerScheduler INT,
        CONSTRAINT syncQueue_fk_ownerUserId
          FOREIGN KEY(ownerUserId)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      )`,

      'DROP TABLE IF EXISTS completedOnFirstSyncColls',
      `CREATE TABLE syncUserSteps (
        _id ${ID_PRIMARY_KEY},
        collName VARCHAR(255) NOT NULL,
        syncedAt BIGINT,
        baseStart BIGINT,
        baseEnd BIGINT,
        isBaseStepReady INT,
        currStart BIGINT,
        currEnd BIGINT,
        isCurrStepReady INT,
        createdAt BIGINT,
        updatedAt BIGINT,
        subUserId INT,
        user_id INT,
        syncQueueId INT,
        CONSTRAINT syncUserSteps_fk_user_id
          FOREIGN KEY(user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT syncUserSteps_fk_subUserId
          FOREIGN KEY(subUserId)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      )`,

      /*
       * Delete data to start the sync from scratch to avoid inconsistency
       * if the previous sync step has not been finished successfully
       */
      ...QUERIES_TO_DELETE_DATA,
      QUERY_TO_SET_INITIAL_SYNC_PROGRESS_STATE
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      'DROP TRIGGER insert_users_createdAt_and_updatedAt',
      'DROP TRIGGER update_users_updatedAt',
      ...getSqlArrToModifyColumns(
        'users',
        {
          _id: ID_PRIMARY_KEY,
          id: 'BIGINT',
          email: 'VARCHAR(255)',
          apiKey: 'VARCHAR(255) NOT NULL',
          apiSecret: 'VARCHAR(255) NOT NULL',
          active: 'INT',
          isDataFromDb: 'INT',
          timezone: 'VARCHAR(255)',
          username: 'VARCHAR(255)',
          passwordHash: 'VARCHAR(255)',
          isNotProtected: 'INT',
          isSubAccount: 'INT',
          isSubUser: 'INT'
        }
      ),

      'DROP TRIGGER insert_subAccounts_createdAt_and_updatedAt',
      'DROP TRIGGER update_subAccounts_updatedAt',
      ...getSqlArrToModifyColumns(
        'subAccounts',
        {
          _id: ID_PRIMARY_KEY,
          masterUserId: 'INT NOT NULL',
          subUserId: 'INT NOT NULL',

          [CONSTR_FIELD_NAME]: [
            `CONSTRAINT #{tableName}_fk_masterUserId
              FOREIGN KEY (masterUserId)
              REFERENCES users(_id)
              ON UPDATE CASCADE
              ON DELETE CASCADE`,
            `CONSTRAINT #{tableName}_fk_subUserId
              FOREIGN KEY (subUserId)
              REFERENCES users(_id)
              ON UPDATE CASCADE
              ON DELETE CASCADE`
          ],
          [TRIGGER_FIELD_NAME]: `delete_#{tableName}_subUsers_from_users
            AFTER DELETE ON #{tableName}
            FOR EACH ROW
            BEGIN
              DELETE FROM users
                WHERE _id = OLD.subUserId;
            END`
        }
      ),

      'DROP INDEX IF EXISTS statusMessages_key__type',
      'DROP INDEX IF EXISTS symbols_pairs',
      'DROP INDEX IF EXISTS mapSymbols_key',
      'DROP INDEX IF EXISTS inactiveCurrencies_pairs',
      'DROP INDEX IF EXISTS inactiveSymbols_pairs',
      'DROP INDEX IF EXISTS futures_pairs',

      'DROP TRIGGER insert_publicСollsСonf_createdAt_and_updatedAt',
      'DROP TRIGGER update_publicСollsСonf_updatedAt',
      ...getSqlArrToModifyColumns(
        'publicСollsСonf',
        {
          _id: ID_PRIMARY_KEY,
          confName: 'VARCHAR(255)',
          symbol: 'VARCHAR(255)',
          start: 'BIGINT',
          timeframe: 'VARCHAR(255)',
          user_id: 'INT NOT NULL',

          [CONSTR_FIELD_NAME]: `\
          CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),

      'DROP TRIGGER insert_scheduler_createdAt_and_updatedAt',
      'DROP TRIGGER update_scheduler_updatedAt',
      ...getSqlArrToModifyColumns(
        'scheduler',
        {
          _id: ID_PRIMARY_KEY,
          isEnable: 'INT'
        }
      ),

      'DROP TRIGGER insert_syncMode_createdAt_and_updatedAt',
      'DROP TRIGGER update_syncMode_updatedAt',
      ...getSqlArrToModifyColumns(
        'syncMode',
        {
          _id: ID_PRIMARY_KEY,
          isEnable: 'INT'
        }
      ),

      'DROP TRIGGER insert_progress_createdAt_and_updatedAt',
      'DROP TRIGGER update_progress_updatedAt',
      ...getSqlArrToModifyColumns(
        'progress',
        {
          _id: ID_PRIMARY_KEY,
          value: 'VARCHAR(255)'
        }
      ),

      'DROP TABLE IF EXISTS syncQueue',
      `CREATE TABLE syncQueue (
        _id ${ID_PRIMARY_KEY},
        collName VARCHAR(255),
        state VARCHAR(255)
      )`,

      'DROP TABLE IF EXISTS syncUserSteps',
      `CREATE TABLE completedOnFirstSyncColls (
        _id ${ID_PRIMARY_KEY},
        collName VARCHAR(255) NOT NULL,
        mts BIGINT,
        subUserId INT,
        user_id INT,
        CONSTRAINT completedOnFirstSyncColls_fk_user_id
          FOREIGN KEY(user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT completedOnFirstSyncColls_fk_subUserId
          FOREIGN KEY(subUserId)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      )`,

      /*
       * Delete data to start the sync from scratch to avoid inconsistency
       * if the previous sync step has not been finished successfully
       */
      ...QUERIES_TO_DELETE_DATA,
      QUERY_TO_SET_INITIAL_SYNC_PROGRESS_STATE
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  after () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV31
