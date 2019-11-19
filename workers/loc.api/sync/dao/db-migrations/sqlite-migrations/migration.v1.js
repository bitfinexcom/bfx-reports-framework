'use strinc'

const AbstractMigration = require('./abstract.migration')

class MigrationV1 extends AbstractMigration {
  /**
   * TODO:
   * @override
   */
  up () {
    console.log('[migration.v1 is upped]'.bgBlue)
  }

  /**
   * TODO:
   * @override
   */
  down () {
    console.log('[migration.v1 is downed]'.bgBlue)
  }
}

module.exports = MigrationV1
