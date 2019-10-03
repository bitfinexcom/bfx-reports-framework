'use strict'

const { pick, isEmpty } = require('lodash')
const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

class PublicСollsСonfAccessors {
  constructor (dao) {
    this.dao = dao
  }

  async editPublicСollsСonf (confName, args) {
    const name = 'publicСollsСonf'
    const data = []

    if (Array.isArray(args.params)) {
      data.push(...args.params)
    } else {
      data.push(args.params)
    }

    const { _id } = await this.dao.checkAuthInDb(args)
    const conf = await this.dao.getElemsInCollBy(
      name,
      {
        filter: {
          confName,
          user_id: _id
        },
        sort: [['symbol', 1]]
      }
    )
    const newData = data.reduce((accum, curr) => {
      if (
        conf.every(item => item.symbol !== curr.symbol) &&
        accum.every(item => item.symbol !== curr.symbol)
      ) {
        accum.push({
          ...pick(curr, ['symbol', 'start']),
          confName,
          user_id: _id
        })
      }

      return accum
    }, [])
    const removedSymbols = conf.reduce((accum, curr) => {
      if (
        data.every(item => item.symbol !== curr.symbol) &&
        accum.every(symbol => symbol !== curr.symbol)
      ) {
        accum.push(curr.symbol)
      }

      return accum
    }, [])
    const updatedData = data.reduce((accum, curr) => {
      if (
        conf.some(item => item.symbol === curr.symbol) &&
        accum.every(item => item.symbol !== curr.symbol)
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
        name,
        null,
        newData
      )
    }
    if (removedSymbols.length > 0) {
      await this.dao.removeElemsFromDb(
        name,
        args.auth,
        {
          confName,
          user_id: _id,
          symbol: removedSymbols
        }
      )
    }

    await this.dao.updateElemsInCollBy(
      name,
      updatedData,
      ['confName', 'user_id', 'symbol'],
      ['start']
    )
  }

  async getPublicСollsСonf (confName, args) {
    const { _id } = await this.dao.checkAuthInDb(args)
    const { params } = { ...args }
    const { symbol } = { ...params }
    const baseFilter = {
      confName,
      user_id: _id
    }
    const filter = isEmpty(symbol)
      ? baseFilter
      : { ...baseFilter, symbol }

    const conf = await this.dao.getElemsInCollBy(
      'publicСollsСonf',
      {
        filter,
        sort: [['symbol', 1]]
      }
    )
    const res = conf.map(item => pick(item, ['symbol', 'start']))

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

  getArgs (confs, args) {
    const { params } = { ...args }

    const symbol = this.getSymbol(
      confs
    )
    const start = this.getStart(
      confs,
      params.start
    )

    return {
      ...args,
      params: {
        ...params,
        symbol,
        start
      }
    }
  }
}

decorate(injectable(), PublicСollsСonfAccessors)
decorate(inject(TYPES.DAO), PublicСollsСonfAccessors, 0)

module.exports = PublicСollsСonfAccessors
