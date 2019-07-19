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

  async getWallets (args) {
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

    const wallets = _wallets.map(w => ({ balanceUsd: null, ...w }))

    return this.currencyConverter.convertByCandles(
      wallets,
      {
        convertTo: 'USD',
        symbolFieldName: 'currency',
        mts: end,
        convFields: [
          { inputField: 'balance', outputField: 'balanceUsd' }
        ]
      }
    )
  }
}

decorate(injectable(), Wallets)
decorate(inject(TYPES.DAO), Wallets, 0)
decorate(inject(TYPES.CurrencyConverter), Wallets, 1)

module.exports = Wallets
