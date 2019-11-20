'use strinc'

const AbstractMigration = require('./abstract.migration')
const {
  getTableCreationQuery
} = require('../../helpers')

class MigrationV1 extends AbstractMigration {
  /**
   * TODO:
   * @override
   */
  up (modelsMap, TABLES_NAMES) {
    console.log('[migration.v1 is upped]'.bgBlue)

    const dbConfigsModel = modelsMap.get(
      TABLES_NAMES.DB_CONFIGS
    )
    const dbConfigsTableCreationQuery = getTableCreationQuery(
      dbConfigsModel
    )
    this.addSql(dbConfigsTableCreationQuery)
  }

  /**
   * TODO:
   * @override
   */
  down (modelsMap, TABLES_NAMES) {
    console.log('[migration.v1 is downed]'.bgBlue)

    this.addSql(`DROP TABLE ${TABLES_NAMES.DB_CONFIGS}`)
  }
}

module.exports = MigrationV1
