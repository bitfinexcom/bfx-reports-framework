'use strict'

/*
 * CREATED_AT: 2023-08-24T04:17:46.764Z
 * VERSION: v38
 */

const {
  ID_PRIMARY_KEY,
  TRIGGER_FIELD_NAME
} = require('./helpers/const')
const {
  getSqlArrToModifyColumns
} = require('./helpers')

const CREATE_UPDATE_MTS_TRIGGERS = [
  `insert_progress_createdAt_and_updatedAt
  AFTER INSERT ON progress
  FOR EACH ROW
  BEGIN
    UPDATE progress
      SET createdAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT),
        updatedAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT)
      WHERE _id = NEW._id;
  END`,
`update_progress_updatedAt
  AFTER UPDATE ON progress
  FOR EACH ROW
  BEGIN
    UPDATE progress
      SET updatedAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT)
      WHERE _id = NEW._id;
  END`
]

const AbstractMigration = require('./abstract.migration')

class MigrationV38 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE progress ADD COLUMN error VARCHAR(255)',
      'ALTER TABLE progress ADD COLUMN state VARCHAR(255)',

      ...getSqlArrToModifyColumns(
        'progress',
        {
          _id: ID_PRIMARY_KEY,
          error: 'VARCHAR(255)',
          value: 'DECIMAL(22,12)',
          state: 'VARCHAR(255)',
          createdAt: 'BIGINT',
          updatedAt: 'BIGINT',

          [TRIGGER_FIELD_NAME]: CREATE_UPDATE_MTS_TRIGGERS
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
      ...getSqlArrToModifyColumns(
        'progress',
        {
          _id: ID_PRIMARY_KEY,
          value: 'VARCHAR(255)',
          createdAt: 'BIGINT',
          updatedAt: 'BIGINT',

          [TRIGGER_FIELD_NAME]: CREATE_UPDATE_MTS_TRIGGERS
        }
      )
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

module.exports = MigrationV38
