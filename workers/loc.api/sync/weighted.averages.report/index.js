'use strict'

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.Authenticator,
  TYPES.SyncSchema,
  TYPES.ALLOWED_COLLS
]
class WeightedAveragesReport {
  constructor (
    dao,
    authenticator,
    syncSchema,
    ALLOWED_COLLS
  ) {
    this.dao = dao
    this.authenticator = authenticator
    this.syncSchema = syncSchema
    this.ALLOWED_COLLS = ALLOWED_COLLS

    this.tradesModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.TRADES)
  }

  async getWeightedAveragesReport (args = {}) {
    const {
      auth = {},
      params = {}
    } = args ?? {}

    const user = await this.authenticator
      .verifyRequestUser({ auth })

    const {
      start = 0,
      end = Date.now(),
      symbol: _symbol = []
    } = params ?? {}
    const symbolArr = Array.isArray(_symbol)
      ? _symbol
      : [_symbol]
    const symbol = symbolArr.filter((s) => (
      s && typeof s === 'string'
    ))

    const trades = await this._getTrades({
      user,
      start,
      end,
      symbol
    })

    // TODO: example returned data structure
    return [
      {
        symbol: 'tBTCUSD',
        buyingWeightedPrice: 123.321,
        buyingAmount: 0.321,
        sellingWeightedPrice: 123.321,
        sellingAmount: 0.321,
        cumulativeWeightedPrice: 123.321,
        cumulativeAmount: 0.321
      },
      {
        symbol: 'tETHUSD',
        buyingWeightedPrice: 321.123,
        buyingAmount: 0.123,
        sellingWeightedPrice: 321.123,
        sellingAmount: 0.123,
        cumulativeWeightedPrice: 321.123,
        cumulativeAmount: 0.123
      }
    ]
  }

  async _getTrades (args) {
    const {
      user = {},
      start = 0,
      end = Date.now(),
      symbol = []
    } = args ?? {}

    const symbFilter = (
      Array.isArray(symbol) &&
      symbol.length !== 0
    )
      ? { $in: { symbol } }
      : {}

    return this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.TRADES,
      {
        filter: {
          user_id: user._id,
          $lte: { mtsCreate: end },
          $gte: { mtsCreate: start },
          ...symbFilter
        },
        sort: [['mtsCreate', -1]],
        projection: this.tradesModel,
        exclude: ['user_id'],
        isExcludePrivate: true
      }
    )
  }
}

decorateInjectable(WeightedAveragesReport, depsTypes)

module.exports = WeightedAveragesReport
