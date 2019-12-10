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
    FOREX_SYMBS
  ) {
    this.dao = dao
    this.FOREX_SYMBS = FOREX_SYMBS
  }

  // TODO:
  async getTradedVolume (
    {
      auth = {},
      params: {
        timeframe = 'day',
        start = 0,
        end = Date.now(),
        symbol
      } = {}
    } = {}
  ) {}
}

decorate(injectable(), TradedVolume)
decorate(inject(TYPES.DAO), TradedVolume, 0)
decorate(inject(TYPES.FOREX_SYMBS), TradedVolume, 1)

module.exports = TradedVolume
