'use strict'

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.CurrencyConverter,
  TYPES.TABLES_NAMES,
  TYPES.Authenticator,
  TYPES.SYNC_API_METHODS
]
class Wallets {
  constructor (
    dao,
    currencyConverter,
    TABLES_NAMES,
    authenticator,
    SYNC_API_METHODS
  ) {
    this.dao = dao
    this.currencyConverter = currencyConverter
    this.TABLES_NAMES = TABLES_NAMES
    this.authenticator = authenticator
    this.SYNC_API_METHODS = SYNC_API_METHODS
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
      this.SYNC_API_METHODS.WALLETS,
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

    return _wallets.map((wallet) => {
      const { currency, balance } = { ...wallet }

      return {
        balanceUsd: currency === 'USD'
          ? balance
          : null,
        ...wallet
      }
    })
  }

  async getFirstWalletsMts (args) {
    const user = await this.authenticator.verifyRequestUser(args)
    const firstLedger = await this.dao.getElemInCollBy(
      this.TABLES_NAMES.LEDGERS,
      { user_id: user._id },
      [['mts', 1], ['id', 1]]
    )
    const { mts } = { ...firstLedger }

    if (!Number.isInteger(mts)) {
      return 0
    }

    return mts
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

decorateInjectable(Wallets, depsTypes)

module.exports = Wallets
