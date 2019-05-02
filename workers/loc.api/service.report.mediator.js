'use strict'

const { pick } = require('lodash')

const BaseMediatorReportService = require(
  'bfx-report/workers/loc.api/service.report.mediator'
)
const {
  getREST,
  getDateNotMoreNow,
  prepareResponse,
  getCsvStoreStatus
} = require('bfx-report/workers/loc.api/helpers')
const {
  DuringSyncMethodAccessError
} = require('bfx-report/workers/loc.api/errors')

const {
  checkParams,
  getMethodLimit,
  getCsvJobData
} = require('./helpers')
const {
  getRiskCsvJobData
} = getCsvJobData
const getRisk = require('./sync/get-risk')
const getBalanceHistory = require('./sync/get-balance-history')

class MediatorReportService extends BaseMediatorReportService {
  async _getCandles (args) {
    try {
      checkParams(
        args,
        'paramsSchemaForCandlesApi',
        ['timeframe', 'symbol', 'section']
      )

      const params = (
        args.params &&
        typeof args.params === 'object'
      )
        ? args.params
        : {}
      params.end = getDateNotMoreNow(params.end)
      params.limit = getMethodLimit(
        params.limit,
        'candles'
      )
      const query = pick(params, [
        'limit',
        'start',
        'end',
        'sort'
      ])
      const rest = getREST({}, this.ctx.grc_bfx.caller)

      const data = await rest.candles.bind(rest)({ ...params, query })

      const res = prepareResponse(
        data,
        'mts',
        params.limit,
        params.notThrowError,
        params.notCheckNextPage
      )

      return res
    } catch (err) {
      this._err(err, '_getCandles')
    }
  }

  async getRisk (space, args, cb) {
    try {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForRiskApi')

      const res = await getRisk(
        this,
        args
      )

      cb(null, res)
    } catch (err) {
      this._err(err, 'getRisk', cb)
    }
  }

  async getBalanceHistory (space, args, cb) {
    try {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForBalanceHistoryApi')

      const res = await getBalanceHistory(
        this,
        args
      )

      cb(null, res)
    } catch (err) {
      this._err(err, 'getBalanceHistory', cb)
    }
  }

  async getMultipleCsv (space, args, cb) {
    try {
      const _args = { ...args, getCsvJobData }

      await super.getMultipleCsv(space, _args, cb)
    } catch (err) {
      this._err(err, 'getMultipleCsv', cb)
    }
  }

  async getRiskCsv (space, args, cb) {
    try {
      const status = await getCsvStoreStatus(this, args)
      const jobData = await getRiskCsvJobData(this, args)
      const processorQueue = this.ctx.lokue_processor.q

      processorQueue.addJob(jobData)

      cb(null, status)
    } catch (err) {
      this._err(err, 'getRiskCsv', cb)
    }
  }
}

module.exports = MediatorReportService
