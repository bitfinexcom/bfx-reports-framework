'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV18 extends AbstractMigration {
  /**
   * @override
   */
  before () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  async up () {
    const sqlArr = [
      `CREATE TABLE positionsSnapshot (
        _id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        id BIGINT,
        symbol VARCHAR(255),
        status VARCHAR(255),
        amount DECIMAL(22,12),
        basePrice DECIMAL(22,12),
        closePrice DECIMAL(22,12),
        marginFunding DECIMAL(22,12),
        marginFundingType INT,
        pl DECIMAL(22,12),
        plPerc DECIMAL(22,12),
        liquidationPrice DECIMAL(22,12),
        leverage DECIMAL(22,12),
        placeholder TEXT,
        mtsCreate BIGINT,
        mtsUpdate BIGINT,
        subUserId INT,
        user_id INT NOT NULL,
        CONSTRAINT positionsSnapshot_fk_user_id
          FOREIGN KEY(user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT positionsSnapshot_fk_subUserId
          FOREIGN KEY(subUserId)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      )`,

      `CREATE UNIQUE INDEX positionsSnapshot_id_user_id
        ON positionsSnapshot(id, user_id)`,
      `CREATE INDEX positionsSnapshot_mtsUpdate_symbol
        ON positionsSnapshot(mtsUpdate, symbol)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  async down () {
    const sqlArr = [
      'DROP TABLE positionsSnapshot'
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  after () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV18
