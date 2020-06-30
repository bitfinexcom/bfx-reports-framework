'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

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

decorate(injectable(), OrderTrades)
decorate(inject(TYPES.DAO), OrderTrades, 0)
decorate(inject(TYPES.TABLES_NAMES), OrderTrades, 1)
decorate(inject(TYPES.SubAccountApiData), OrderTrades, 2)
decorate(inject(TYPES.RService), OrderTrades, 3)
decorate(inject(TYPES.SYNC_API_METHODS), OrderTrades, 4)

module.exports = OrderTrades
