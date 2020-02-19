'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')
const {
  orderBy,
  isEmpty
} = require('lodash')
const {
  prepareResponse
} = require('bfx-report/workers/loc.api/helpers')
const {
  FindMethodError
} = require('bfx-report/workers/loc.api/errors')

const {
  isSubAccountApiKeys
} = require('../../helpers')
const {
  AuthError
} = require('../../errors')

const TYPES = require('../../di/types')

class SubAccountApiData {
  constructor (
    dao
  ) {
    this.dao = dao
  }

  _getUsersArgs (
    args = {},
    subUsers = []
  ) {
    const { params } = { ...args }

    return subUsers.reduce((accum, subUser) => {
      const { apiKey, apiSecret } = { ...subUser }

      if (
        !apiKey ||
        typeof apiKey !== 'string' ||
        !apiSecret ||
        typeof apiSecret !== 'string'
      ) {
        return accum
      }

      accum.push({
        ...args,
        auth: { apiKey, apiSecret },
        params: {
          ...params,
          notThrowError: true,
          notCheckNextPage: true
        }
      })

      return accum
    }, [])
  }

  async fetchDataFormApi (
    method,
    argsArr,
    params = {},
    opts = {}
  ) {
    const {
      limit = 10000,
      notThrowError,
      notCheckNextPage
    } = { ...params }
    const {
      datePropName,
      isThrownErrIfAllFail,
      isNotPreparedResponse
    } = { ...opts }

    const errors = []
    const promises = argsArr.map(async (args) => {
      try {
        const res = await method(args)

        return res
      } catch (err) {
        if (isThrownErrIfAllFail) {
          errors.push(err)

          return
        }

        throw err
      }
    })
    const resArr = await Promise.all(promises)

    if (
      errors.length > 0 &&
      errors.length >= resArr.length
    ) {
      const err = errors[0]
      err.errors = errors

      throw err
    }

    const mergedRes = resArr.reduce((accum, curr) => {
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
    }, [])

    const orderedRes = orderBy(mergedRes, [datePropName], ['desc'])

    if (isNotPreparedResponse) {
      return orderedRes
    }

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

  async getDataForSubAccount (
    method,
    args,
    opts = {}
  ) {
    if (typeof method !== 'function') {
      throw new FindMethodError()
    }

    const { auth } = { ...args }
    const { params } = { ...args }

    if (!isSubAccountApiKeys(auth)) {
      return method(args)
    }

    const subUsers = await this.dao
      .getSubUsersByMasterUserApiKeys(auth)

    if (
      !Array.isArray(subUsers) ||
      subUsers.length === 0 ||
      subUsers.some((sUser) => isEmpty(sUser))
    ) {
      throw new AuthError()
    }

    const argsArr = this._getUsersArgs(
      args,
      subUsers
    )

    return this.fetchDataFormApi(
      method,
      argsArr,
      params,
      opts
    )
  }
}

decorate(injectable(), SubAccountApiData)
decorate(inject(TYPES.DAO), SubAccountApiData, 0)

module.exports = SubAccountApiData
