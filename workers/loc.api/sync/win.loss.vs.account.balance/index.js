'use strict'

const {
  calcGroupedData,
  groupByTimeframe
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
      shouldTimeframePLBeReturned,
      isUnrealizedProfitExcluded,
      isVSPrevDayBalance
    } = params ?? {}
    const args = {
      auth: user,
      params: {
        /*
         * We have to get day timeframe data for all timeframes
         * and then pick data for non-day timeframes due to accuracy issue
         */
        timeframe: 'day',
        start,
        end,
        isUnrealizedProfitExcluded
      }
    }

    const {
      firstWalletsVals,
      walletsGroupedByTimeframe,
      withdrawalsGroupedByTimeframe,
      depositsGroupedByTimeframe,
      plGroupedByTimeframe
    } = await this.winLoss.getDataToCalcWinLoss(args)

    const getWinLossPercByTimeframe = isVSPrevDayBalance
      ? this._getWinLossPrevDayBalanceByTimeframe(
        {
          shouldTimeframePLBeReturned,
          isUnrealizedProfitExcluded,
          firstWalletsVals
        }
      )
      : this._getWinLossVSAccountBalanceByTimeframe(
        {
          isUnrealizedProfitExcluded,
          firstWalletsVals
        }
      )

    const groupedData = await calcGroupedData(
      {
        walletsGroupedByTimeframe,
        withdrawalsGroupedByTimeframe,
        depositsGroupedByTimeframe,
        plGroupedByTimeframe
      },
      false,
      getWinLossPercByTimeframe,
      true
    )
    const pickedRes = timeframe === 'day'
      ? groupedData
      : (await groupByTimeframe(
          groupedData,
          { timeframe, start, end },
          null,
          'mts',
          null,
          (data = []) => data[0]
        )).map((obj) => {
          const res = obj?.vals ?? {}
          res.mts = obj.mts

          return res
        })
    pickedRes.push({
      mts: start,
      perc: 0
    })
    const res = this.winLoss.shiftMtsToNextTimeframe(
      pickedRes,
      { timeframe, end }
    )

    return res
  }

  _getWinLossVSAccountBalanceByTimeframe ({
    isUnrealizedProfitExcluded,
    firstWalletsVals
  }) {
    let firstPLVals = {}
    let prevMovementsRes = {}
    let percCorrection = 0
    let prevPerc = 0
    let firstWallets = 0
    let prevWallets = 0

    return ({
      walletsGroupedByTimeframe = {},
      withdrawalsGroupedByTimeframe = {},
      depositsGroupedByTimeframe = {},
      plGroupedByTimeframe = {}
    } = {}, i, arr) => {
      const symb = 'USD'
      const isFirst = (i + 1) === arr.length

      if (isFirst) {
        firstPLVals = plGroupedByTimeframe
        firstWallets = Number.isFinite(firstWalletsVals[symb])
          ? firstWalletsVals[symb]
          : 0
        prevWallets = firstWallets
      }

      const newMovementsRes = this.winLoss.sumMovementsWithPrevRes(
        {},
        withdrawalsGroupedByTimeframe,
        depositsGroupedByTimeframe
      )
      const newMovements = Number.isFinite(newMovementsRes[symb])
        ? newMovementsRes[symb]
        : 0
      const hasNewMovements = !!newMovements
      prevMovementsRes = this.winLoss.sumMovementsWithPrevRes(
        hasNewMovements ? {} : prevMovementsRes,
        newMovementsRes
      )

      const wallets = Number.isFinite(walletsGroupedByTimeframe[symb])
        ? walletsGroupedByTimeframe[symb]
        : 0
      const firstPL = Number.isFinite(firstPLVals[symb])
        ? firstPLVals[symb]
        : 0
      const pl = Number.isFinite(plGroupedByTimeframe[symb])
        ? plGroupedByTimeframe[symb]
        : 0

      if (hasNewMovements) {
        firstWallets = prevWallets + newMovements
      }

      prevWallets = wallets

      const realized = wallets - firstWallets
      const unrealized = isUnrealizedProfitExcluded
        ? 0
        : pl - firstPL

      const winLoss = realized + unrealized

      if (
        !Number.isFinite(winLoss) ||
        firstWallets === 0
      ) {
        return { perc: percCorrection }
      }

      if (newMovements) {
        percCorrection = prevPerc
      }

      const perc = ((winLoss / firstWallets) * 100) + percCorrection
      prevPerc = perc

      return { perc }
    }
  }

  _getWinLossPrevDayBalanceByTimeframe ({
    shouldTimeframePLBeReturned,
    isUnrealizedProfitExcluded,
    firstWalletsVals
  }) {
    let prevPerc = 0
    let prevWallets = 0
    let prevPL = 0
    let prevMultiplying = 1
    let totalMovements = 0

    return ({
      walletsGroupedByTimeframe = {},
      withdrawalsGroupedByTimeframe = {},
      depositsGroupedByTimeframe = {},
      plGroupedByTimeframe = {}
    } = {}, i, arr) => {
      const symb = 'USD'
      const isFirst = (i + 1) === arr.length

      if (isFirst) {
        prevWallets = Number.isFinite(firstWalletsVals[symb])
          ? firstWalletsVals[symb]
          : 0
        prevPL = Number.isFinite(plGroupedByTimeframe[symb])
          ? plGroupedByTimeframe[symb]
          : 0
      }

      const movementsRes = this.winLoss.sumMovementsWithPrevRes(
        {},
        withdrawalsGroupedByTimeframe,
        depositsGroupedByTimeframe
      )

      const movements = Number.isFinite(movementsRes[symb])
        ? movementsRes[symb]
        : 0
      totalMovements += movements
      const wallets = Number.isFinite(walletsGroupedByTimeframe[symb])
        ? walletsGroupedByTimeframe[symb]
        : 0
      const pl = Number.isFinite(plGroupedByTimeframe[symb])
        ? plGroupedByTimeframe[symb]
        : 0

      const realized = (wallets - movements) - prevWallets
      const unrealized = isUnrealizedProfitExcluded
        ? 0
        : pl - prevPL

      const winLoss = realized + unrealized
      const balanceWithoutMovements = wallets - totalMovements

      prevWallets = wallets
      prevPL = pl

      if (
        !Number.isFinite(winLoss) ||
        prevWallets === 0
      ) {
        if (shouldTimeframePLBeReturned) {
          return {
            balanceWithoutMovements,
            pl: Number.isFinite(winLoss)
              ? winLoss
              : 0,
            perc: prevPerc
          }
        }

        return { perc: prevPerc }
      }

      prevMultiplying = ((prevWallets + winLoss) / prevWallets) * prevMultiplying
      const perc = (prevMultiplying - 1) * 100
      prevPerc = perc

      if (shouldTimeframePLBeReturned) {
        return {
          balanceWithoutMovements,
          pl: Number.isFinite(winLoss)
            ? winLoss
            : 0,
          perc: prevPerc
        }
      }

      return { perc }
    }
  }
}

decorateInjectable(WinLossVSAccountBalance, depsTypes)

module.exports = WinLossVSAccountBalance
