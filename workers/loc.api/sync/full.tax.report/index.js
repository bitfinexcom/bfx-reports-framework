'use strict'

const {
  isForexSymb
} = require('../helpers')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.FullSnapshotReport,
  TYPES.Authenticator,
  TYPES.Movements
]
class FullTaxReport {
  constructor (
    dao,
    fullSnapshotReport,
    authenticator,
    movements
  ) {
    this.dao = dao
    this.fullSnapshotReport = fullSnapshotReport
    this.authenticator = authenticator
    this.movements = movements
  }

  async _getMovements ({
    user = {},
    start = 0,
    end = Date.now()
  }) {
    return this.movements.getMovements({
      auth: user,
      start,
      end,
      filter: {
        $eq: { status: 'COMPLETED' }
      }
    })
  }

  _calcMovementsTotalAmount (movements) {
    if (
      !Array.isArray(movements) ||
      movements.length === 0
    ) {
      return null
    }

    const res = movements.reduce((accum, movement = {}) => {
      const { amount, amountUsd, currency } = { ...movement }
      const _isForexSymb = isForexSymb(currency)
      const _isNotUsedAmountUsdField = (
        _isForexSymb &&
        !Number.isFinite(amountUsd)
      )
      const _amount = _isNotUsedAmountUsdField
        ? amount
        : amountUsd
      const symb = _isNotUsedAmountUsdField
        ? currency
        : 'USD'

      if (!Number.isFinite(_amount)) {
        return { ...accum }
      }

      return {
        ...accum,
        [symb]: Number.isFinite(accum[symb])
          ? accum[symb] + _amount
          : _amount
      }
    }, {})
    const { USD } = { ...res }

    return USD
  }

  _getPeriodBalances (
    walletsTotalBalanceUsd,
    positionsTotalPlUsd
  ) {
    const _walletsTotalBalanceUsd = Number.isFinite(walletsTotalBalanceUsd)
      ? walletsTotalBalanceUsd
      : 0
    const _positionsTotalPlUsd = Number.isFinite(positionsTotalPlUsd)
      ? positionsTotalPlUsd
      : 0

    const totalResult = _walletsTotalBalanceUsd + _positionsTotalPlUsd

    return {
      walletsTotalBalanceUsd,
      positionsTotalPlUsd,
      totalResult
    }
  }

  _calcTotalResult (
    endingTotalResult,
    movementsTotalAmount,
    startingTotalResult
  ) {
    const _endingTotalResult = Number.isFinite(endingTotalResult)
      ? endingTotalResult
      : 0
    const _movementsTotalAmount = Number.isFinite(movementsTotalAmount)
      ? movementsTotalAmount
      : 0
    const _startingTotalResult = Number.isFinite(startingTotalResult)
      ? startingTotalResult
      : 0

    return _endingTotalResult - _movementsTotalAmount - _startingTotalResult
  }

  async getFullTaxReport ({
    auth = {},
    params: {
      start = 0,
      end = Date.now()
    } = {}
  } = {}) {
    const user = await this.authenticator
      .verifyRequestUser({ auth })

    const startingFullSnapshotPromise = this.fullSnapshotReport
      .getFullSnapshotReport({
        auth,
        params: { end: start }
      })
    const endingFullSnapshotPromise = this.fullSnapshotReport
      .getFullSnapshotReport({
        auth,
        params: { end }
      })
    const movements = await this._getMovements({
      user,
      start,
      end
    })
    const movementsTotalAmountPromise = this._calcMovementsTotalAmount(
      movements
    )

    const [
      startingFullSnapshot,
      endingFullSnapshot,
      movementsTotalAmount
    ] = await Promise.all([
      startingFullSnapshotPromise,
      endingFullSnapshotPromise,
      movementsTotalAmountPromise
    ])
    const {
      positionsSnapshot: startingPositionsSnapshot,
      walletsTotalBalanceUsd: startingWalletsTotalBalanceUsd,
      positionsTotalPlUsd: startingPositionsTotalPlUsd
    } = startingFullSnapshot
    const {
      positionsSnapshot: endingPositionsSnapshot,
      walletsTotalBalanceUsd: endingWalletsTotalBalanceUsd,
      positionsTotalPlUsd: endingPositionsTotalPlUsd
    } = endingFullSnapshot

    const startingPeriodBalances = this._getPeriodBalances(
      startingWalletsTotalBalanceUsd,
      startingPositionsTotalPlUsd
    )
    const endingPeriodBalances = this._getPeriodBalances(
      endingWalletsTotalBalanceUsd,
      endingPositionsTotalPlUsd
    )

    const {
      totalResult: endingTotalResult
    } = { ...endingPeriodBalances }
    const {
      totalResult: startingTotalResult
    } = { ...startingPeriodBalances }
    const totalResult = this._calcTotalResult(
      endingTotalResult,
      movementsTotalAmount,
      startingTotalResult
    )

    return {
      startingPositionsSnapshot,
      endingPositionsSnapshot,
      finalState: {
        startingPeriodBalances,
        movements,
        movementsTotalAmount,
        endingPeriodBalances,
        totalResult
      }
    }
  }
}

decorateInjectable(FullTaxReport, depsTypes)

module.exports = FullTaxReport
