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

const getParamsArrToTestTimeframeGrouping = (
  params = {},
  timeframes = ['day', 'month', 'year']
) => {
  return Array(timeframes.length)
    .fill({ ...params })
    .map((item, i) => {
      const timeframeIndex = i % timeframes.length

      return {
        ...item,
        timeframe: timeframes[timeframeIndex]
      }
    })
}

const getRServiceProxy = (
  rService,
  hooks = {}
) => {
  if (
    !hooks ||
    typeof hooks !== 'object' ||
    Object.keys(hooks).length === 0
  ) {
    return rService
  }

  return new Proxy(rService, {
    get (target, propKey) {
      if (typeof hooks[propKey] === 'function') {
        return new Proxy(target[propKey], {
          apply (targetMethod, context, argsList) {
            return Reflect.apply(hooks[propKey], context, ...arguments)
          }
        })
      }

      const val = Reflect.get(...arguments)

      return typeof val === 'function'
        ? val.bind(target)
        : val
    }
  })
}

module.exports = {
  connToSQLite,
  closeSQLite,
  delay,
  getParamsArrToTestTimeframeGrouping,
  getRServiceProxy
}
