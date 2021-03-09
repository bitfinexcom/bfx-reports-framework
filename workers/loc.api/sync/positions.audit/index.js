'use strict'

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.SubAccountApiData
]
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

decorateInjectable(PositionsAudit, depsTypes)

module.exports = PositionsAudit
