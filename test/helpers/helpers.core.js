'use strict'

const container = require('bfx-report/workers/loc.api/di')

const {
  delay: _delay
} = require('../../workers/loc.api/sync/helpers')
const TYPES = require('../../workers/loc.api/di/types')

const emptyDB = async () => {
  const { dbDriver } = container.get(TYPES.CONF)
  const rService = container.get(TYPES.RService)
  const dao = container.get(TYPES.DAO)

  if (dbDriver === 'better-sqlite') {
    await dao.dropAllTables()
    await rService._initialize(dao.db)

    return
  }

  throw new Error('ERR_DB_DRIVER CONNECT HAS NOT BEEN IMPLEMENTED')
}

const delay = (mc = 500) => _delay(mc)

const getParamsArrToTestTimeframeGrouping = (
  params = {},
  timeframes = ['day', 'week', 'month', 'year']
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
            return Reflect.apply(hooks[propKey], context, arguments)
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
  emptyDB,
  delay,
  getParamsArrToTestTimeframeGrouping,
  getRServiceProxy
}
