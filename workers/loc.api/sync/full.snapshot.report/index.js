'use strict'

const INTERRUPTER_NAMES = require(
  '@bitfinex/bfx-report/workers/loc.api/interrupter/interrupter.names'
)

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.Wallets,
  TYPES.PositionsSnapshot,
  TYPES.InterrupterFactory,
  TYPES.Authenticator
]
class FullSnapshotReport {
  constructor (
    wallets,
    positionsSnapshot,
    interrupterFactory,
    authenticator
  ) {
    this.wallets = wallets
    this.positionsSnapshot = positionsSnapshot
    this.interrupterFactory = interrupterFactory
    this.authenticator = authenticator
  }

  _getWalletsTickers (walletsSnapshot = [], interrupter) {
    if (!Array.isArray(walletsSnapshot)) {
      return []
    }

    return walletsSnapshot.reduce((accum, wallet) => {
      const {
        type: walletType,
        currency,
        balance,
        balanceUsd
      } = { ...wallet }

      if (
        currency === 'USD' ||
        !Number.isFinite(balance) ||
        !Number.isFinite(balanceUsd) ||
        balance === 0 ||
        balanceUsd === 0 ||
        interrupter.hasInterrupted()
      ) {
        return accum
      }

      const separator = currency.length > 3
        ? ':'
        : ''
      const symbol = `t${currency}${separator}USD`

      accum.push({
        walletType,
        symbol,
        amount: balanceUsd / balance
      })

      return accum
    }, [])
  }

  _calcObjFieldInArr (array, fieldName, interrupter) {
    if (
      !Array.isArray(array) ||
      array.length === 0 ||
      interrupter.hasInterrupted()
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

  _calcPositionsTotalPlUsd (positionsSnapshot, interrupter) {
    return this._calcObjFieldInArr(
      positionsSnapshot,
      'plUsd',
      interrupter
    )
  }

  _calcWalletsTotalBalanceUsd (walletsSnapshot, interrupter) {
    return this._calcObjFieldInArr(
      walletsSnapshot,
      'balanceUsd',
      interrupter
    )
  }

  #getEmptyResponse (timestamps) {
    return {
      timestamps,
      positionsSnapshot: [],
      walletsSnapshot: [],
      positionsTickers: [],
      walletsTickers: [],
      positionsTotalPlUsd: null,
      walletsTotalBalanceUsd: null
    }
  }

  async getFullSnapshotReport (args) {
    const { auth, params } = args ?? {}
    const end = params?.end ?? Date.now()
    const user = await this.authenticator
      .verifyRequestUser({ auth })
    const interrupter = this.interrupterFactory({
      user,
      name: INTERRUPTER_NAMES.FULL_SNAPSHOT_REPORT_INTERRUPTER
    })
    const timestamps = {
      mtsCreated: Date.now(),
      end
    }

    const _args = {
      ...args,
      auth: user,
      params: {
        ...params,
        end
      }
    }

    const positionsSnapshotAndTickersPromise = this.positionsSnapshot
      .getPositionsSnapshotAndTickers(_args, { interrupter })
    const walletsSnapshotPromise = this.wallets
      .getWalletsConvertedByPublicTrades(_args, { interrupter })
    const [
      positionsSnapshotAndTickers,
      walletsSnapshot
    ] = await Promise.all([
      positionsSnapshotAndTickersPromise,
      walletsSnapshotPromise
    ])
    const {
      positionsSnapshot,
      tickers: positionsTickers
    } = positionsSnapshotAndTickers

    const walletsTickers = this._getWalletsTickers(
      walletsSnapshot,
      interrupter
    )
    const positionsTotalPlUsd = this._calcPositionsTotalPlUsd(
      positionsSnapshot,
      interrupter
    )
    const walletsTotalBalanceUsd = this._calcWalletsTotalBalanceUsd(
      walletsSnapshot,
      interrupter
    )

    const hasInterrupted = interrupter.hasInterrupted()
    interrupter.emitInterrupted()

    if (hasInterrupted) {
      return this.#getEmptyResponse(timestamps)
    }

    return {
      timestamps,
      positionsSnapshot,
      walletsSnapshot,
      positionsTickers,
      walletsTickers,
      positionsTotalPlUsd,
      walletsTotalBalanceUsd
    }
  }
}

decorateInjectable(FullSnapshotReport, depsTypes)

module.exports = FullSnapshotReport
