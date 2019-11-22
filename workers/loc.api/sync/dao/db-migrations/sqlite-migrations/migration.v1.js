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

    const dbConfigsModelMap = new Map([[
      TABLES_NAMES.DB_CONFIGS,
      modelsMap.get(TABLES_NAMES.DB_CONFIGS)
    ]])
    const dbConfigsTableCreationQuery = getTableCreationQuery(
      dbConfigsModelMap
    ).map((sql) => ({ sql }))
    this.addSql(dbConfigsTableCreationQuery)
  }

  /**
   * TODO:
   * @override
   */
  down (modelsMap, TABLES_NAMES) {
    console.log('[migration.v1 is downed]'.bgBlue)

    this.addSql(() => this.dao.dropTable(TABLES_NAMES.DB_CONFIGS))
  }
}

module.exports = MigrationV1
