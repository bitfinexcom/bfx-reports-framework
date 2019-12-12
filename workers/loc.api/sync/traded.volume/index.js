'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

class TradedVolume {
  constructor (
    dao,
    ALLOWED_COLLS,
    syncSchema,
    FOREX_SYMBS
  ) {
    this.dao = dao
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.syncSchema = syncSchema
    this.FOREX_SYMBS = FOREX_SYMBS
  }

  async _getTrades ({
    auth,
    start,
    end,
    symbol
  }) {
    const user = await this.dao.checkAuthInDb({ auth })

    const symbFilter = (
      Array.isArray(symbol) &&
      symbol.length !== 0
    )
      ? { $in: { symbol } }
      : {}
    const tradesModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.TRADES)

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
        projection: tradesModel,
        exclude: ['user_id'],
        isExcludePrivate: true
      }
    )
  }

  // TODO:
  async getTradedVolume (
    {
      auth = {},
      params = {}
    } = {}
  ) {
    const {
      timeframe = 'day',
      start = 0,
      end = Date.now(),
      symbol: symbs
    } = { ...params }
    const _symbol = Array.isArray(symbs)
      ? symbs
      : [symbs]
    const symbol = _symbol.filter((s) => (
      s && typeof s === 'string'
    ))
    const args = {
      auth,
      start,
      end,
      symbol
    }

    const trades = await this._getTrades(args)

    return trades // TODO:
  }
}

decorate(injectable(), TradedVolume)
decorate(inject(TYPES.DAO), TradedVolume, 0)
decorate(inject(TYPES.ALLOWED_COLLS), TradedVolume, 1)
decorate(inject(TYPES.SyncSchema), TradedVolume, 2)
decorate(inject(TYPES.FOREX_SYMBS), TradedVolume, 3)

module.exports = TradedVolume
