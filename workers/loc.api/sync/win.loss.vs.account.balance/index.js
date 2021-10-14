'use strict'

const {
  calcGroupedData
} = require('../helpers')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.Authenticator,
  TYPES.WinLoss
]
class WinLossVSAccountBalance {
  constructor (
    authenticator,
    winLoss
  ) {
    this.authenticator = authenticator
    this.winLoss = winLoss
  }

  async getWinLossVSAccountBalance (_args = {}) {
    const {
      auth = {},
      params = {}
    } = _args ?? {}
    const user = await this.authenticator
      .verifyRequestUser({ auth })

    const {
      timeframe = 'day',
      start = 0,
      end = Date.now(),
      isUnrealizedProfitExcluded
    } = params ?? {}
    const args = {
      auth: user,
      params: {
        timeframe,
        start,
        end,
        isUnrealizedProfitExcluded
      }
    }

    const {
      walletsGroupedByTimeframe,
      withdrawalsGroupedByTimeframe,
      depositsGroupedByTimeframe,
      plGroupedByTimeframe
    } = await this.winLoss.getDataToCalcWinLoss(args)

    const groupedData = await calcGroupedData(
      {
        walletsGroupedByTimeframe,
        withdrawalsGroupedByTimeframe,
        depositsGroupedByTimeframe,
        plGroupedByTimeframe
      },
      false,
      this._winLossVSAccountBalanceByTimeframe(
        { isUnrealizedProfitExcluded }
      ),
      true
    )
    groupedData.push({
      mts: start,
      perc: 0
    })
    const res = this.winLoss.shiftMtsToNextTimeframe(
      groupedData,
      { timeframe, end }
    )

    return res
  }

  _winLossVSAccountBalanceByTimeframe ({
    isUnrealizedProfitExcluded
  }) {
    let firstWalletsVals = {}
    let firstPLVals = 0
    let prevMovementsRes = 0

    return ({
      walletsGroupedByTimeframe = {},
      withdrawalsGroupedByTimeframe = {},
      depositsGroupedByTimeframe = {},
      plGroupedByTimeframe = {}
    } = {}, i, arr) => {
      const symb = 'USD'
      const isFirst = (i + 1) === arr.length

      if (isFirst) {
        firstWalletsVals = walletsGroupedByTimeframe
        firstPLVals = plGroupedByTimeframe
      }

      prevMovementsRes = this.winLoss.sumMovementsWithPrevRes(
        prevMovementsRes,
        withdrawalsGroupedByTimeframe,
        depositsGroupedByTimeframe
      )

      const movements = Number.isFinite(prevMovementsRes[symb])
        ? prevMovementsRes[symb]
        : 0
      const firstWallets = Number.isFinite(firstWalletsVals[symb])
        ? firstWalletsVals[symb]
        : 0
      const wallets = Number.isFinite(walletsGroupedByTimeframe[symb])
        ? walletsGroupedByTimeframe[symb]
        : 0
      const firstPL = Number.isFinite(firstPLVals[symb])
        ? firstPLVals[symb]
        : 0
      const pl = Number.isFinite(plGroupedByTimeframe[symb])
        ? plGroupedByTimeframe[symb]
        : 0

      const realized = (wallets - movements) - firstWallets
      const unrealized = isUnrealizedProfitExcluded
        ? 0
        : pl - firstPL

      const winLoss = realized + unrealized

      if (
        !Number.isFinite(winLoss) ||
        firstWallets === 0
      ) {
        return { perc: 0 }
      }

      const perc = (winLoss / firstWallets) * 100

      return { perc }
    }
  }
}

decorateInjectable(WinLossVSAccountBalance, depsTypes)

module.exports = WinLossVSAccountBalance
