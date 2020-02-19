'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')
const { isEmpty } = require('lodash')
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

class PositionsAudit {
  constructor (
    dao,
    TABLES_NAMES,
    subAccountApiData
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.subAccountApiData = subAccountApiData
  }

  _getUsersArgs (
    args = {},
    subUsers = [],
    positionsHistory = []
  ) {
    const { params } = { ...args }
    const { id } = { ...params }

    const argsArr = id.reduce((accum, auditedId) => {
      const positionHistory = positionsHistory.find((item) => {
        const { id } = { ...item }

        return auditedId === id
      })
      const { subUserId } = { ...positionHistory }

      if (!Number.isInteger(subUserId)) {
        return accum
      }

      const subUser = subUsers.find((user) => {
        const { _id } = { ...user }

        return subUserId === _id
      })
      const { apiKey, apiSecret } = { ...subUser }

      if (
        !apiKey ||
        typeof apiKey !== 'string' ||
        !apiSecret ||
        typeof apiSecret !== 'string'
      ) {
        return accum
      }

      const argsWithCurrApiKeys = accum.find((item) => {
        const { auth } = { ...item }

        return (
          apiKey === auth.apiKey &&
          apiSecret === auth.apiSecret
        )
      })

      if (argsWithCurrApiKeys) {
        argsWithCurrApiKeys.params.id.push(auditedId)

        return accum
      }

      accum.push({
        ...args,
        auth: { apiKey, apiSecret },
        params: {
          ...params,
          notThrowError: true,
          notCheckNextPage: true,
          id: [auditedId]
        }
      })

      return accum
    }, [])

    return argsArr
  }

  async getPositionsAuditForSubAccount (
    method,
    args,
    checkParamsFn
  ) {
    if (typeof method !== 'function') {
      throw new FindMethodError()
    }

    const { auth } = { ...args }

    if (!isSubAccountApiKeys(auth)) {
      return method(args)
    }
    if (typeof checkParamsFn === 'function') {
      checkParamsFn(args)
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

    const { params } = { ...args }
    const { id } = { ...params }

    if (
      !Array.isArray(id) ||
      id.length === 0
    ) {
      return []
    }

    const positionsHistory = await this.dao.getElemsInCollBy(
      this.TABLES_NAMES.POSITIONS_HISTORY,
      {
        filter: {
          $in: { id },
          $isNotNull: 'subUserId'
        }
      }
    )

    if (
      !Array.isArray(positionsHistory) ||
      positionsHistory.length === 0
    ) {
      return []
    }

    const argsArr = this._getUsersArgs(
      args,
      subUsers,
      positionsHistory
    )

    return this.subAccountApiData
      .fetchDataFormApi(
        method,
        argsArr,
        params,
        { datePropName: 'mtsUpdate' }
      )
  }
}

decorate(injectable(), PositionsAudit)
decorate(inject(TYPES.DAO), PositionsAudit, 0)
decorate(inject(TYPES.TABLES_NAMES), PositionsAudit, 1)
decorate(inject(TYPES.SubAccountApiData), PositionsAudit, 2)

module.exports = PositionsAudit
