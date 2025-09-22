'use strict'

/*
 * CREATED_AT: 2025-09-19T07:32:50.867Z
 * VERSION: v43
 */

const AbstractMigration = require('./abstract.migration')

class MigrationV43 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'DROP TABLE payInvoiceList'
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      `CREATE TABLE payInvoiceList (
        _id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
        id VARCHAR(255), 
        t BIGINT, 
        duration INT, 
        amount DECIMAL(22,12), 
        currency VARCHAR(255), 
        orderId VARCHAR(255), 
        payCurrencies TEXT, 
        webhook VARCHAR(255), 
        redirectUrl VARCHAR(255), 
        status VARCHAR(255), 
        customerInfo TEXT, 
        invoices TEXT, 
        payment TEXT, 
        merchantName VARCHAR(255), 
        subUserId INT, 
        user_id INT NOT NULL, 
        CONSTRAINT payInvoiceList_fk_user_id
          FOREIGN KEY (user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE, 
        CONSTRAINT payInvoiceList_fk_subUserId
          FOREIGN KEY (subUserId)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      )`,

      `CREATE UNIQUE INDEX payInvoiceList_id_user_id
        ON payInvoiceList(id, user_id)`,
      `CREATE INDEX payInvoiceList_user_id_currency_t
        ON payInvoiceList(user_id, currency, t)`,
      `CREATE INDEX payInvoiceList_user_id_id_t
        ON payInvoiceList(user_id, id, t)`,
      `CREATE INDEX payInvoiceList_user_id_t
        ON payInvoiceList(user_id, t)`,
      `CREATE INDEX payInvoiceList_user_id_subUserId_t
        ON payInvoiceList(user_id, subUserId, t) 
        WHERE subUserId IS NOT NULL`,
      `CREATE INDEX payInvoiceList_subUserId_id
        ON payInvoiceList(subUserId, id) 
        WHERE subUserId IS NOT NULL`
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

module.exports = MigrationV43
