'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

const {
  TRIGGER_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('./helpers/const')

class MigrationV32 extends AbstractMigration {
  /**
   * @override
   */
  before () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE users ADD COLUMN authToken VARCHAR(255)',

      ...getSqlArrToModifyColumns(
        'users',
        {
          _id: ID_PRIMARY_KEY,
          id: 'BIGINT',
          email: 'VARCHAR(255)',
          apiKey: 'VARCHAR(255)',
          apiSecret: 'VARCHAR(255)',
          authToken: 'VARCHAR(255)',
          active: 'INT',
          isDataFromDb: 'INT',
          timezone: 'VARCHAR(255)',
          username: 'VARCHAR(255)',
          passwordHash: 'VARCHAR(255)',
          isNotProtected: 'INT',
          isSubAccount: 'INT',
          isSubUser: 'INT',
          createdAt: 'BIGINT',
          updatedAt: 'BIGINT',

          [TRIGGER_FIELD_NAME]: [
            `insert_users_createdAt_and_updatedAt
              AFTER INSERT ON users
              FOR EACH ROW
              BEGIN
                UPDATE users
                  SET createdAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT),
                    updatedAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT)
                  WHERE _id = NEW._id;
              END`,
            `update_users_updatedAt
              AFTER UPDATE ON users
              FOR EACH ROW
              BEGIN
                UPDATE users
                  SET updatedAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT)
                  WHERE _id = NEW._id;
              END`,
            `insert_users_apiKey_and_apiSecret
              BEFORE INSERT ON users
              FOR EACH ROW
              BEGIN
                SELECT
                  CASE
                    WHEN (NEW.authToken IS NULL AND NEW.apiKey IS NULL) OR
                      (NEW.apiKey IS NULL AND NEW.apiSecret IS NOT NULL)
                    THEN
                      RAISE (FAIL,'Invalid apiKey')
                    WHEN (NEW.authToken IS NULL AND NEW.apiSecret IS NULL) OR
                      (NEW.apiSecret IS NULL AND NEW.apiKey IS NOT NULL)
                    THEN
                      RAISE (FAIL,'Invalid apiSecret')
                  END;
              END`,
            `update_users_apiKey_and_apiSecret
              BEFORE UPDATE ON users
              FOR EACH ROW
              BEGIN
                SELECT
                  CASE
                    WHEN (NEW.authToken IS NULL AND NEW.apiKey IS NULL) OR
                      (NEW.apiKey IS NULL AND NEW.apiSecret IS NOT NULL)
                    THEN
                      RAISE (FAIL,'Invalid apiKey')
                    WHEN (NEW.authToken IS NULL AND NEW.apiSecret IS NULL) OR
                      (NEW.apiSecret IS NULL AND NEW.apiKey IS NOT NULL)
                    THEN
                      RAISE (FAIL,'Invalid apiSecret')
                  END;
              END`
          ]
        }
      )
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      'DROP TRIGGER insert_users_apiKey_and_apiSecret',
      'DROP TRIGGER update_users_apiKey_and_apiSecret',

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
          isSubUser: 'INT',
          createdAt: 'BIGINT',
          updatedAt: 'BIGINT',

          [TRIGGER_FIELD_NAME]: [
            `insert_users_createdAt_and_updatedAt
              AFTER INSERT ON users
              FOR EACH ROW
              BEGIN
                UPDATE users
                  SET createdAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT),
                    updatedAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT)
                  WHERE _id = NEW._id;
              END`,
            `update_users_updatedAt
              AFTER UPDATE ON users
              FOR EACH ROW
              BEGIN
                UPDATE users
                  SET updatedAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT)
                  WHERE _id = NEW._id;
              END`
          ]
        }
      )
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  after () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV32
