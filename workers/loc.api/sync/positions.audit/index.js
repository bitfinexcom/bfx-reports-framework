'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

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

  _getPositionsHistoryById (id) {
    return this.dao.getElemsInCollBy(
      this.TABLES_NAMES.POSITIONS_HISTORY,
      {
        filter: {
          $in: { id },
          $isNotNull: 'subUserId'
        }
      }
    )
  }

  async getPositionsAuditForSubAccount (
    method,
    args,
    opts = {}
  ) {
    const { params } = { ...args }
    const { id } = { ...params }
    const {
      getDataFnToFindSubUserId = () => this._getPositionsHistoryById(id),
      idFieldNameForFinding = 'id',
      datePropName = 'mtsUpdate'
    } = { ...opts }

    if (
      !Array.isArray(id) ||
      id.length === 0
    ) {
      return []
    }

    return this.subAccountApiData.getDataForSubAccount(
      method,
      args,
      {
        ...opts,
        getDataFnToFindSubUserId,
        idFieldNameForFinding,
        datePropName
      }
    )
  }
}

decorate(injectable(), PositionsAudit)
decorate(inject(TYPES.DAO), PositionsAudit, 0)
decorate(inject(TYPES.TABLES_NAMES), PositionsAudit, 1)
decorate(inject(TYPES.SubAccountApiData), PositionsAudit, 2)

module.exports = PositionsAudit
