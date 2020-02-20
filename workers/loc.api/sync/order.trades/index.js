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
    rService
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.subAccountApiData = subAccountApiData
    this.rService = rService
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
      '_getTrades',
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

module.exports = OrderTrades
