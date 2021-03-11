'use strict'

const {
  orderBy,
  isEmpty
} = require('lodash')
const {
  prepareResponse
} = require('bfx-report/workers/loc.api/helpers')
const {
  AuthError,
  FindMethodError
} = require('bfx-report/workers/loc.api/errors')

const {
  DatePropNameError
} = require('../../errors')

const { decorateInjectable } = require('../../di/utils')

class SubAccountApiData {
  _hasId (id) {
    return (
      Number.isInteger(id) ||
      (
        Array.isArray(id) &&
        id.length > 0
      )
    )
  }

  pushArgs (
    accum,
    args,
    auth,
    itemId
  ) {
    const { params } = { ...args }
    const { apiKey, apiSecret } = { ...auth }

    if (
      !apiKey ||
      typeof apiKey !== 'string' ||
      !apiSecret ||
      typeof apiSecret !== 'string'
    ) {
      return accum
    }

    const { id } = this._hasId(itemId)
      ? { id: itemId }
      : { ...params }
    const idParam = this._hasId(id)
      ? { id }
      : {}

    accum.push({
      ...args,
      auth: { apiKey, apiSecret },
      params: {
        ...params,
        notThrowError: true,
        notCheckNextPage: true,
        ...idParam
      }
    })

    return accum
  }

  getUsersArgs (
    args = {},
    subUsers = [],
    dataToFindSubUserId = [],
    idFieldName
  ) {
    const { params } = { ...args }
    const { id } = { ...params }

    if (
      !Array.isArray(dataToFindSubUserId) ||
      dataToFindSubUserId.length === 0 ||
      !this._hasId(id) ||
      !idFieldName ||
      typeof idFieldName !== 'string'
    ) {
      return subUsers.reduce((accum, subUser) => {
        return this.pushArgs(
          accum,
          args,
          subUser
        )
      }, [])
    }

    const ids = Array.isArray(id)
      ? id
      : [id]

    return ids.reduce((accum, currId) => {
      const item = dataToFindSubUserId.find((item) => {
        const id = ({ ...item })[idFieldName]

        return currId === id
      })
      const { subUserId } = { ...item }

      if (!Number.isInteger(subUserId)) {
        return accum
      }

      const subUser = subUsers.find((user) => {
        const { _id } = { ...user }

        return subUserId === _id
      })
      const { apiKey, apiSecret } = { ...subUser }

      if (!Array.isArray(id)) {
        return this.pushArgs(
          accum,
          args,
          subUser,
          currId
        )
      }

      const argsWithCurrApiKeys = accum.find((item) => {
        const { auth } = { ...item }

        return (
          apiKey === auth.apiKey &&
          apiSecret === auth.apiSecret
        )
      })

      const { params: _params } = { ...argsWithCurrApiKeys }
      const { id: _id } = { ..._params }

      if (Array.isArray(_id)) {
        _id.push(currId)

        return accum
      }

      return this.pushArgs(
        accum,
        args,
        subUser,
        [currId]
      )
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
    const {
      checkParamsFn,
      dataToFindSubUserId = [],
      getDataFnToFindSubUserId,
      idFieldNameForFinding,
      datePropName
    } = { ...opts }
    const {
      isSubAccount,
      subUsers
    } = { ...auth }

    if (
      !datePropName ||
      typeof datePropName !== 'string'
    ) {
      throw new DatePropNameError()
    }
    if (!isSubAccount) {
      return method(args)
    }
    if (typeof checkParamsFn === 'function') {
      checkParamsFn(args)
    }

    if (
      !Array.isArray(subUsers) ||
      subUsers.length === 0 ||
      subUsers.some((sUser) => isEmpty(sUser))
    ) {
      throw new AuthError()
    }

    const _dataToFindSubUserId = Array.isArray(dataToFindSubUserId)
      ? dataToFindSubUserId
      : []
    const data = (
      typeof getDataFnToFindSubUserId === 'function'
    )
      ? await getDataFnToFindSubUserId()
      : []
    const _data = Array.isArray(data)
      ? data
      : []
    const orderedData = orderBy(
      [..._dataToFindSubUserId, ..._data],
      [datePropName],
      ['desc']
    )

    const argsArr = this.getUsersArgs(
      args,
      subUsers,
      orderedData,
      idFieldNameForFinding
    )

    return this.fetchDataFormApi(
      method,
      argsArr,
      params,
      opts
    )
  }
}

decorateInjectable(SubAccountApiData)

module.exports = SubAccountApiData
