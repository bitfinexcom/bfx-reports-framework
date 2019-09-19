'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

class FullSnapshotReport {
  constructor (
    wallets,
    positionsSnapshot
  ) {
    this.wallets = wallets
    this.positionsSnapshot = positionsSnapshot
  }

  _getWalletsTickers (walletsSnapshot = []) {
    if (!Array.isArray(walletsSnapshot)) {
      return []
    }

    const walletsWithoutUsdType = walletsSnapshot
      .filter((wallets) => {
        const {
          currency,
          balance,
          balanceUsd
        } = { ...wallets }

        return (
          currency !== 'USD' &&
          Number.isFinite(balance) &&
          Number.isFinite(balanceUsd) &&
          balance !== 0 &&
          balanceUsd !== 0
        )
      })

    return walletsWithoutUsdType.map((wallets) => {
      const {
        type: walletType,
        currency,
        balance,
        balanceUsd
      } = { ...wallets }
      const separator = currency.length > 3
        ? ':'
        : ''
      const symbol = `t${currency}${separator}USD`

      return {
        walletType,
        symbol,
        amount: balanceUsd / balance
      }
    })
  }

  _calcObjFieldInArr (array, fieldName) {
    if (
      !Array.isArray(array) ||
      array.length === 0
    ) {
      return null
    }

    return array.reduce((accum, curr) => {
      const obj = { ...curr }
      const fieldVal = obj[fieldName]

      if (!Number.isFinite(fieldVal)) {
        return accum
      }

      return Number.isFinite(accum)
        ? accum + fieldVal
        : fieldVal
    }, 0)
  }

  _calcPositionsTotalPlUsd (positionsSnapshot) {
    return this._calcObjFieldInArr(
      positionsSnapshot,
      'plUsd'
    )
  }

  _calcWalletsTotalBalanceUsd (walletsSnapshot) {
    return this._calcObjFieldInArr(
      walletsSnapshot,
      'balanceUsd'
    )
  }

  async getFullSnapshotReport (args) {
    const { params = {} } = { ...args }
    const { end = Date.now() } = { ...params }

    const _args = {
      ...args,
      params: {
        ...params,
        end
      }
    }

    const {
      positionsSnapshot,
      tickers: positionsTickers
    } = await this.positionsSnapshot
      .getPositionsSnapshotAndTickers(_args)
    const walletsSnapshot = await this.wallets
      .getWalletsConvertedByPublicTrades(_args)
    const walletsTickers = this._getWalletsTickers(
      walletsSnapshot
    )
    const positionsTotalPlUsd = this._calcPositionsTotalPlUsd(
      positionsSnapshot
    )
    const walletsTotalBalanceUsd = this._calcWalletsTotalBalanceUsd(
      walletsSnapshot
    )

    return {
      positionsSnapshot,
      walletsSnapshot,
      positionsTickers,
      walletsTickers,
      positionsTotalPlUsd,
      walletsTotalBalanceUsd
    }
  }
}

decorate(injectable(), FullSnapshotReport)
decorate(inject(TYPES.Wallets), FullSnapshotReport, 0)
decorate(inject(TYPES.PositionsSnapshot), FullSnapshotReport, 1)

module.exports = FullSnapshotReport
