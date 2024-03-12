'use strict'

/*
 * CREATED_AT: 2024-03-11T10:04:50.055Z
 * VERSION: v40
 */

const AbstractMigration = require('./abstract.migration')

class MigrationV40 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'DROP INDEX IF EXISTS publicСollsСonf_symbol_user_id_confName_timeframe',
      'DROP TRIGGER IF EXISTS insert_publicСollsСonf_createdAt_and_updatedAt',
      'DROP TRIGGER IF EXISTS update_publicСollsСonf_updatedAt',

      `CREATE TABLE publicCollsConf
      (
        _id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
        confName VARCHAR(255), 
        symbol VARCHAR(255), 
        start BIGINT, 
        timeframe VARCHAR(255), 
        createdAt BIGINT, 
        updatedAt BIGINT, 
        user_id INT NOT NULL, 
        CONSTRAINT publicCollsConf_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
      )`,
      'INSERT INTO publicCollsConf SELECT * FROM publicСollsСonf',
      'DROP TABLE publicСollsСonf'
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      'DROP INDEX IF EXISTS publicCollsConf_symbol_user_id_confName_timeframe',
      'DROP TRIGGER IF EXISTS insert_publicCollsConf_createdAt_and_updatedAt',
      'DROP TRIGGER IF EXISTS update_publicCollsConf_updatedAt',

      `CREATE TABLE publicСollsСonf
      (
        _id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
        confName VARCHAR(255), 
        symbol VARCHAR(255), 
        start BIGINT, 
        timeframe VARCHAR(255), 
        createdAt BIGINT, 
        updatedAt BIGINT, 
        user_id INT NOT NULL, 
        CONSTRAINT publicСollsСonf_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
      )`,
      'INSERT INTO publicСollsСonf SELECT * FROM publicCollsConf',
      'DROP TABLE publicCollsConf'
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

module.exports = MigrationV40
