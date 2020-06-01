'use strict'

const {
  pick,
  omit,
  isEmpty,
  orderBy
} = require('lodash')
const {
  decorate,
  injectable,
  inject
} = require('inversify')
const {
  prepareResponse
} = require('bfx-report/workers/loc.api/helpers')
const {
  FindMethodError
} = require('bfx-report/workers/loc.api/errors')

const TYPES = require('../../di/types')
const {
  GetPublicDataError
} = require('../../errors')

class PublicСollsСonfAccessors {
  constructor (
    dao,
    TABLES_NAMES,
    authenticator
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.authenticator = authenticator

    this.confNamesMap = new Map([
      ['candlesConf', this.TABLES_NAMES.CANDLES],
      ['statusMessagesConf', this.TABLES_NAMES.STATUS_MESSAGES],
      ['tickersHistoryConf', this.TABLES_NAMES.TICKERS_HISTORY],
      ['publicTradesConf', this.TABLES_NAMES.PUBLIC_TRADES]
    ])
  }

  isCandlesConfs (confName) {
    return confName === 'candlesConf'
  }

  isUniqueConf (confName, confs, currConf) {
    return confs.every((conf) => (
      conf.symbol !== currConf.symbol ||
      (
        this.isCandlesConfs(confName) &&
        conf.timeframe !== currConf.timeframe
      )
    ))
  }

  hasConf (confName, confs, currConf) {
    return confs.some((conf) => (
      conf.symbol === currConf.symbol &&
      (
        !this.isCandlesConfs(confName) ||
        conf.timeframe === currConf.timeframe
      )
    ))
  }

  async editAllPublicСollsСonfs (args) {
    const { params } = { ...args }
    const _params = pick(
      params,
      [...this.confNamesMap.keys()]
    )
    const paramsArr = Object.entries(_params)
    const syncedColls = []

    for (const [confName, params] of paramsArr) {
      const _args = {
        ...args,
        params
      }

      await this.editPublicСollsСonf(confName, _args)

      const syncedColl = this.confNamesMap.get(confName)

      if (typeof syncedColl === 'string') {
        syncedColls.push(syncedColl)
      }
    }

    return syncedColls
  }

  async editPublicСollsСonf (confName, args) {
    const data = Array.isArray(args.params)
      ? [...args.params]
      : [args.params]

    const { _id } = await this.authenticator.verifyRequestUser(args)
    const conf = await this.dao.getElemsInCollBy(
      this.TABLES_NAMES.PUBLIC_COLLS_CONF,
      {
        filter: {
          confName,
          user_id: _id
        },
        sort: [['symbol', 1], ['timeframe', 1]]
      }
    )
    const newData = data.reduce((accum, curr) => {
      if (
        this.isUniqueConf(confName, conf, curr) &&
        this.isUniqueConf(confName, accum, curr)
      ) {
        const propNames = this.isCandlesConfs(confName)
          ? ['symbol', 'start', 'timeframe']
          : ['symbol', 'start']

        accum.push({
          ...pick(curr, propNames),
          confName,
          user_id: _id
        })
      }

      return accum
    }, [])
    const removedIds = conf.reduce((accum, curr) => {
      if (
        this.isUniqueConf(confName, data, curr) &&
        this.isUniqueConf(confName, accum, curr)
      ) {
        accum.push(curr._id)
      }

      return accum
    }, [])
    const updatedData = data.reduce((accum, curr) => {
      if (
        this.hasConf(confName, conf, curr) &&
        this.isUniqueConf(confName, accum, curr)
      ) {
        accum.push({
          ...curr,
          confName,
          user_id: _id
        })
      }

      return accum
    }, [])

    if (newData.length > 0) {
      await this.dao.insertElemsToDb(
        this.TABLES_NAMES.PUBLIC_COLLS_CONF,
        null,
        newData
      )
    }
    if (removedIds.length > 0) {
      await this.dao.removeElemsFromDb(
        this.TABLES_NAMES.PUBLIC_COLLS_CONF,
        args.auth,
        {
          confName,
          user_id: _id,
          _id: removedIds
        }
      )
    }

    const filterPropNames = this.isCandlesConfs(confName)
      ? ['symbol', 'timeframe']
      : ['symbol']

    await this.dao.updateElemsInCollBy(
      this.TABLES_NAMES.PUBLIC_COLLS_CONF,
      updatedData,
      ['confName', 'user_id', ...filterPropNames],
      ['start']
    )
  }

  async getAllPublicСollsСonfs (args) {
    await this.authenticator.verifyRequestUser(args)

    const confNames = [...this.confNamesMap.keys()]
    const res = {}

    for (const confName of confNames) {
      res[confName] = await this.getPublicСollsСonf(confName, args)
    }

    return res
  }

  async getPublicСollsСonf (confName, args) {
    const { _id } = await this.authenticator.verifyRequestUser(args)
    const { params } = { ...args }
    const {
      symbol,
      timeframe
    } = { ...params }
    const baseFilter = {
      confName,
      user_id: _id
    }

    const symbolFilter = (
      symbol &&
      (
        typeof symbol === 'string' ||
        (Array.isArray(symbol) && symbol.length > 0)
      )
    )
      ? { symbol }
      : {}
    const timeframeFilter = (
      timeframe &&
      (
        typeof timeframe === 'string' ||
        (Array.isArray(timeframe) && timeframe.length > 0)
      )
    )
      ? { timeframe }
      : {}
    const filter = {
      ...baseFilter,
      ...symbolFilter,
      ...timeframeFilter
    }

    const conf = await this.dao.getElemsInCollBy(
      this.TABLES_NAMES.PUBLIC_COLLS_CONF,
      {
        filter,
        sort: [['symbol', 1], ['timeframe', 1]]
      }
    )
    const res = conf.map((item) => {
      const { confName } = { ...item }
      const propNames = this.isCandlesConfs(confName)
        ? ['symbol', 'start', 'timeframe']
        : ['symbol', 'start']

      return pick(item, propNames)
    })

    return res
  }

  getStart (confs, start = 0) {
    const _confs = Array.isArray(confs)
      ? confs
      : [confs]
    const minConfStart = _confs.reduce(
      (accum, conf) => {
        return (accum === null || conf.start < accum)
          ? conf.start
          : accum
      },
      null
    )

    return (
      Number.isFinite(start) &&
      start < minConfStart
    )
      ? minConfStart
      : start
  }

  getSymbol (confs) {
    const _confs = Array.isArray(confs)
      ? confs
      : [confs]
    const confsSymbols = _confs.map(({ symbol }) => symbol)

    return confsSymbols
  }

  getTimeframe (confs) {
    const _confs = Array.isArray(confs)
      ? confs
      : [confs]
    const confsTimeframe = _confs.map(({ timeframe }) => timeframe)

    return confsTimeframe
  }

  getArgs (confs, args) {
    const { params } = { ...args }

    const symbol = this.getSymbol(
      confs
    )
    const start = this.getStart(
      confs,
      params.start
    )
    const timeframe = this.getTimeframe(
      confs
    )

    const timeframeParam = (
      Array.isArray(timeframe) &&
      timeframe.length > 0
    )
      ? { timeframe }
      : {}

    return {
      ...args,
      auth: null,
      params: {
        ...params,
        symbol,
        start,
        timeframeParam
      }
    }
  }

  _getArgsArrForNotSyncedParams (confs, args) {
    const { params } = { ...args }
    const {
      symbol,
      timeframe
    } = { ...params }
    const symbolArr = Array.isArray(symbol)
      ? symbol
      : [symbol]
    const timeframeArr = Array.isArray(timeframe)
      ? timeframe
      : [timeframe]
    const filteredSymbols = symbolArr.filter((symb) => {
      return symb && typeof symb === 'string'
    })
    const filteredTimeframes = timeframeArr.filter((timeframe) => {
      return timeframe && typeof timeframe === 'string'
    })
    const paramsArr = []

    for (const symb of filteredSymbols) {
      const conf = confs.find(({ symbol }) => {
        return symbol === symb
      })

      if (
        isEmpty(conf) &&
        filteredTimeframes.length === 0
      ) {
        paramsArr.push({ symbol: symb })

        continue
      }

      for (const tFrame of filteredTimeframes) {
        const conf = confs.find(({ symbol, timeframe }) => {
          return symbol === symb && timeframe === tFrame
        })

        if (isEmpty(conf)) {
          paramsArr.push({ symbol: symb, timeframe: tFrame })
        }
      }
    }

    return paramsArr.map((_params) => {
      return {
        ...args,
        params: {
          ...omit(params, ['symbol', 'timeframe']),
          ..._params
        }
      }
    })
  }

  async getPublicData (
    method,
    incomingArgs,
    opts = {}
  ) {
    if (typeof method !== 'function') {
      throw new FindMethodError()
    }

    const {
      checkParamsFn,
      datePropName,
      confName,
      collName
    } = { ...opts }

    if (
      !datePropName ||
      typeof datePropName !== 'string' ||
      !confName ||
      typeof confName !== 'string' ||
      !collName ||
      typeof collName !== 'string'
    ) {
      throw new GetPublicDataError()
    }
    if (typeof checkParamsFn === 'function') {
      checkParamsFn(incomingArgs)
    }

    const { params: incomingParams } = { ...incomingArgs }
    const params = this.isCandlesConfs(confName)
      ? incomingParams
      : omit(incomingParams, ['timeframe'])
    const args = { ...incomingArgs, params }
    const {
      limit = 10000,
      notThrowError,
      notCheckNextPage
    } = { ...params }

    const confs = await this.getPublicСollsСonf(
      confName,
      args
    )

    if (isEmpty(confs)) {
      return method(args)
    }

    const _args = this.getArgs(confs, args)

    const dbRes = await this.dao.findInCollBy(
      collName,
      _args,
      {
        isPrepareResponse: false,
        isPublic: true
      }
    )
    const _dbRes = Array.isArray(dbRes)
      ? dbRes
      : []

    const argsArr = this._getArgsArrForNotSyncedParams(confs, args)
    const promises = argsArr.map((args) => method(args))
    const apiResArr = await Promise.all(promises)

    const mergedRes = apiResArr.reduce((accum, curr) => {
      const { res } = Array.isArray(curr)
        ? { res: curr }
        : { ...curr }

      if (
        Array.isArray(res) &&
        res.length !== 0
      ) {
        accum.push(...res)
      }

      return accum
    }, _dbRes)

    const orderedRes = orderBy(mergedRes, [datePropName], ['desc'])
    const limitedRes = Number.isInteger(limit)
      ? orderedRes.slice(0, limit)
      : orderedRes

    const firstElem = { ...limitedRes[0] }
    const mts = firstElem[datePropName]
    const isNotContainedSameMts = limitedRes.some((item) => {
      const _item = { ...item }
      const _mts = _item[datePropName]

      return _mts !== mts
    })
    const res = isNotContainedSameMts
      ? limitedRes
      : orderedRes

    return prepareResponse(
      res,
      datePropName,
      limit,
      notThrowError,
      notCheckNextPage
    )
  }
}

decorate(injectable(), PublicСollsСonfAccessors)
decorate(inject(TYPES.DAO), PublicСollsСonfAccessors, 0)
decorate(inject(TYPES.TABLES_NAMES), PublicСollsСonfAccessors, 1)
decorate(inject(TYPES.Authenticator), PublicСollsСonfAccessors, 2)

module.exports = PublicСollsСonfAccessors
