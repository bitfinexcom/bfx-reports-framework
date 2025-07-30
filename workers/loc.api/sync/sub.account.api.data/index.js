'use strict'

const {
  orderBy
} = require('lodash')
const {
  isEmpty
} = require('lib-js-util-base')
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

const depsTypes = (TYPES) => [
  TYPES.GetDataFromApi
]

class SubAccountApiData {
  constructor (
    getDataFromApi
  ) {
    this.getDataFromApi = getDataFromApi
  }

  _hasId (id) {
    return (
      Number.isInteger(id) ||
      (
        Array.isArray(id) &&
        id.length > 0
      )
    )
  }

  pushArgs (data, opts) {
    const {
      accum,
      args,
      auth,
      itemId
    } = data ?? {}
    const {
      isNotPreparedResponse
    } = opts ?? {}

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
    const extraParams = isNotPreparedResponse
      ? {}
      : {
          notThrowError: true,
          notCheckNextPage: true
        }

    accum.push({
      ...args,
      auth: { apiKey, apiSecret },
      params: {
        ...params,
        ...extraParams,
        ...idParam
      }
    })

    return accum
  }

  getUsersArgs (
    args = {},
    subUsers = [],
    dataToFindSubUserId = [],
    opts
  ) {
    const {
      idFieldNameForFinding
    } = opts ?? {}
    const { params } = { ...args }
    const { id } = { ...params }

    if (
      !Array.isArray(dataToFindSubUserId) ||
      dataToFindSubUserId.length === 0 ||
      !this._hasId(id) ||
      !idFieldNameForFinding ||
      typeof idFieldName !== 'string'
    ) {
      return subUsers.reduce((accum, subUser) => {
        return this.pushArgs(
          {
            accum,
            args,
            auth: subUser
          },
          opts
        )
      }, [])
    }

    const ids = Array.isArray(id)
      ? id
      : [id]

    return ids.reduce((accum, currId) => {
      const item = dataToFindSubUserId.find((item) => {
        const id = ({ ...item })[idFieldNameForFinding]

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
          {
            accum,
            args,
            auth: subUser,
            itemId: currId
          },
          opts
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
        {
          accum,
          args,
          auth: subUser,
          itemId: [currId]
        },
        opts
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
    } = params ?? {}
    const {
      datePropName,
      isThrownErrIfAllFail,
      isNotPreparedResponse
    } = opts ?? {}

    const errors = []
    const resArr = []

    for (const args of argsArr) {
      try {
        const res = await this.getDataFromApi({
          getData: (space, args) => method(args),
          args,
          callerName: 'SUB_ACCOUNT_API_DATA',
          shouldNotInterrupt: true
        })

        resArr.push(res)
      } catch (err) {
        if (isThrownErrIfAllFail) {
          errors.push(err)

          continue
        }

        throw err
      }
    }

    if (
      errors.length > 0 &&
      errors.length >= resArr.length
    ) {
      const err = errors[0]
      err.errors = errors

      throw err
    }

    const mergedRes = resArr.reduce((accum, curr) => {
      const res = Array.isArray(curr)
        ? curr
        : curr?.res ?? curr ?? {}

      if (Array.isArray(res)) {
        accum.push(...res)

        return accum
      }

      accum.push(res)

      return accum
    }, [])

    const orderedRes = orderBy(mergedRes, [datePropName], ['desc'])

    if (isNotPreparedResponse) {
      return orderedRes
    }

    const limitedRes = Number.isInteger(limit)
      ? orderedRes.slice(0, limit)
      : orderedRes

    const firstElem = limitedRes[0]
    const mts = firstElem?.[datePropName]
    const isNotContainedSameMts = limitedRes.some((item) => {
      const _mts = item?.[datePropName]

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
      opts
    )

    return this.fetchDataFormApi(
      method,
      argsArr,
      params,
      opts
    )
  }
}

decorateInjectable(SubAccountApiData, depsTypes)

module.exports = SubAccountApiData
