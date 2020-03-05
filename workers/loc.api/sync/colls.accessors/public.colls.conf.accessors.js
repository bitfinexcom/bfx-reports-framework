'use strict'

const { pick } = require('lodash')
const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

class PublicСollsСonfAccessors {
  constructor (
    dao,
    TABLES_NAMES
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
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
        this.isCandlesConfs(confName) ||
        conf.timeframe === currConf.timeframe
      )
    ))
  }

  async editPublicСollsСonf (confName, args) {
    const data = []

    if (Array.isArray(args.params)) {
      data.push(...args.params)
    } else {
      data.push(args.params)
    }

    const { _id } = await this.dao.checkAuthInDb(args)
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
        this.hasConf(confName, accum, curr) &&
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

  async getPublicСollsСonf (confName, args) {
    const { _id } = await this.dao.checkAuthInDb(args)
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
      typeof symbol === 'string'
    )
      ? { symbol }
      : {}
    const timeframeFilter = (
      timeframe &&
      typeof timeframe === 'string'
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
    const res = conf.map(item => pick(
      item,
      ['symbol', 'start', 'timeframe']
    ))

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
      params: {
        ...params,
        symbol,
        start,
        timeframeParam
      }
    }
  }
}

decorate(injectable(), PublicСollsСonfAccessors)
decorate(inject(TYPES.DAO), PublicСollsСonfAccessors, 0)
decorate(inject(TYPES.TABLES_NAMES), PublicСollsСonfAccessors, 1)

module.exports = PublicСollsСonfAccessors
