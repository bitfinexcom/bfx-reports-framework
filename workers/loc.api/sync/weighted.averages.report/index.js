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
    const calcedTrades = this._calcTrades(trades)

    return calcedTrades
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

  _calcTrades (trades = []) {
    const symbResMap = new Map()

    for (const trade of trades) {
      const {
        symbol,
        execAmount,
        execPrice
      } = trade ?? {}

      if (
        !symbol ||
        typeof symbol !== 'string' ||
        !Number.isFinite(execAmount) ||
        execAmount === 0 ||
        !Number.isFinite(execPrice) ||
        execPrice === 0
      ) {
        continue
      }

      const isBuying = execAmount > 0
      const spent = execAmount * execPrice

      const existedSymbRes = symbResMap.get(symbol)
      const {
        absSumSpent: _absSumSpent = 0,
        absSumAmount: _absSumAmount = 0,
        sumAmount: _sumAmount = 0,
        sumBuyingSpent: _sumBuyingSpent = 0,
        sumBuyingAmount: _sumBuyingAmount = 0,
        sumSellingSpent: _sumSellingSpent = 0,
        sumSellingAmount: _sumSellingAmount = 0
      } = existedSymbRes ?? {}

      const absSumSpent = Number.isFinite(spent)
        ? _absSumSpent + Math.abs(spent)
        : _absSumSpent
      const absSumAmount = _absSumAmount + Math.abs(execAmount)
      const sumAmount = _sumAmount + execAmount
      const sumBuyingSpent = (
        isBuying &&
        Number.isFinite(spent)
      )
        ? _sumBuyingSpent + spent
        : _sumBuyingSpent
      const sumBuyingAmount = isBuying
        ? _sumBuyingAmount + execAmount
        : _sumBuyingAmount
      const sumSellingSpent = (
        !isBuying &&
        Number.isFinite(spent)
      )
        ? _sumSellingSpent + spent
        : _sumSellingSpent
      const sumSellingAmount = !isBuying
        ? _sumSellingAmount + execAmount
        : _sumSellingAmount

      symbResMap.set(symbol, {
        absSumSpent,
        absSumAmount,
        sumAmount,
        sumBuyingSpent,
        sumBuyingAmount,
        sumSellingSpent,
        sumSellingAmount,

        buyingWeightedPrice: sumBuyingAmount === 0
          ? 0
          : sumBuyingSpent / sumBuyingAmount,
        buyingAmount: sumBuyingAmount,
        sellingWeightedPrice: sumSellingAmount === 0
          ? 0
          : sumSellingSpent / sumSellingAmount,
        sellingAmount: sumSellingAmount,
        cumulativeWeightedPrice: sumAmount === 0
          ? 0
          : absSumSpent / absSumAmount,
        cumulativeAmount: sumAmount
      })
    }

    return [...symbResMap].map(([symbol, val]) => {
      const {
        buyingWeightedPrice = 0,
        buyingAmount = 0,
        sellingWeightedPrice = 0,
        sellingAmount = 0,
        cumulativeWeightedPrice = 0,
        cumulativeAmount = 0
      } = val ?? {}

      return {
        symbol,
        buyingWeightedPrice,
        buyingAmount,
        sellingWeightedPrice,
        sellingAmount,
        cumulativeWeightedPrice,
        cumulativeAmount
      }
    })
  }
}

decorateInjectable(WeightedAveragesReport, depsTypes)

module.exports = WeightedAveragesReport
