'use strict'

const SqliteDb = require('sqlite3')
const container = require('bfx-report/workers/loc.api/di')

const {
  delay: _delay
} = require('../../workers/loc.api/sync/helpers')
const TYPES = require('../../workers/loc.api/di/types')

const connToSQLite = () => {
  return new Promise((resolve, reject) => {
    const db = new SqliteDb.Database(':memory:', async (err) => {
      if (err) {
        reject(err)

        return
      }

      await container.get(TYPES.RService)._initialize(db)
      resolve(db)
    })
  })
}

const closeSQLite = (db) => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err)

        return
      }

      resolve()
    })
  })
}

const delay = (mc = 500) => _delay(mc)

module.exports = {
  connToSQLite,
  closeSQLite,
  delay
}
