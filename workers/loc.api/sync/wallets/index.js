'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

class Wallets {
  constructor (
    dao,
    currencyConverter
  ) {
    this.dao = dao
    this.currencyConverter = currencyConverter
  }

  _getConvSchema (args) {
    const {
      params: { end = Date.now() } = {}
    } = { ...args }

    return {
      convertTo: 'USD',
      symbolFieldName: 'currency',
      mts: end,
      convFields: [
        { inputField: 'balance', outputField: 'balanceUsd' }
      ]
    }
  }

  async _getWallets (args) {
    const {
      auth = {},
      params: { end = Date.now() } = {}
    } = { ...args }

    const walletsFromLedgers = await this.dao.findInCollBy(
      '_getWallets',
      {
        auth,
        params: { end }
      }
    )

    const _wallets = walletsFromLedgers
      .filter(({
        type,
        balance,
        currency
      } = {}) => (
        type &&
        typeof type === 'string' &&
        balance &&
        Number.isFinite(balance) &&
        typeof currency === 'string' &&
        currency.length >= 3
      ))

    return _wallets.map(w => ({ balanceUsd: null, ...w }))
  }

  async getWallets (args) {
    const wallets = await this._getWallets(args)
    const convSchema = this._getConvSchema(args)

    return this.currencyConverter.convertByCandles(
      wallets,
      convSchema
    )
  }

  async getWalletsConvertedByPublicTrades (args) {
    const wallets = await this._getWallets(args)
    const convSchema = this._getConvSchema(args)

    return this.currencyConverter.convert(
      wallets,
      convSchema
    )
  }
}

decorate(injectable(), Wallets)
decorate(inject(TYPES.DAO), Wallets, 0)
decorate(inject(TYPES.CurrencyConverter), Wallets, 1)

module.exports = Wallets
