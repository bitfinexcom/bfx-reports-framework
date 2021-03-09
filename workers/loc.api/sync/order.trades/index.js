'use strict'

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.SubAccountApiData,
  TYPES.RService,
  TYPES.SYNC_API_METHODS
]
class OrderTrades {
  constructor (
    dao,
    TABLES_NAMES,
    subAccountApiData,
    rService,
    SYNC_API_METHODS
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.subAccountApiData = subAccountApiData
    this.rService = rService
    this.SYNC_API_METHODS = SYNC_API_METHODS
  }

  _getTradesById (orderID) {
    return this.dao.getElemsInCollBy(
      this.TABLES_NAMES.TRADES,
      {
        filter: {
          $eq: { orderID },
          $isNotNull: 'subUserId'
        }
      }
    )
  }

  async getOrderTradesForSubAccount (
    method,
    args,
    opts = {}
  ) {
    const { params } = { ...args }
    const { id } = { ...params }
    const {
      getDataFnToFindSubUserId = () => this._getTradesById(id),
      idFieldNameForFinding = 'orderID',
      datePropName = 'mtsCreate'
    } = { ...opts }

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

  async getOrderTrades (
    method,
    args,
    opts = {}
  ) {
    const {
      checkParamsFn
    } = { ...opts }

    if (!await this.rService.isSyncModeWithDbData(null, args)) {
      return this.getOrderTradesForSubAccount(
        method,
        args,
        opts
      )
    }
    if (typeof checkParamsFn === 'function') {
      checkParamsFn(args)
    }

    const { params } = { ...args }
    const { id: orderID } = { ...params }

    return this.dao.findInCollBy(
      this.SYNC_API_METHODS.TRADES,
      args,
      {
        isPrepareResponse: true,
        schema: {
          additionalFilteringProps: { orderID }
        }
      }
    )
  }
}

decorateInjectable(OrderTrades, depsTypes)

module.exports = OrderTrades
