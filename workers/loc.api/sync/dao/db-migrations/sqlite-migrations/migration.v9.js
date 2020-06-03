'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV9 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'DROP INDEX movements_id_mtsUpdated_user_id',

      'DELETE FROM movements',

      /*
      * Remove statusMessages sync configs to allow UI
      * sync that collection from scratch
      */
      `DELETE FROM publicСollsСonf
        WHERE confName = 'statusMessagesConf'`,

      `CREATE UNIQUE INDEX movements_id_user_id
        ON movements(id, user_id)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      'DROP INDEX movements_id_user_id',

      'DELETE FROM movements',

      `CREATE UNIQUE INDEX movements_id_mtsUpdated_user_id
        ON movements(id, mtsUpdated, user_id)`
    ]

    this.addSql(sqlArr)
  }
}

module.exports = MigrationV9
