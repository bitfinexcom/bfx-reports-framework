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
      firstWalletsVals,
      walletsGroupedByTimeframe,
      withdrawalsGroupedByTimeframe,
      depositsGroupedByTimeframe,
      plGroupedByTimeframe,
      subAccountsTransferLedgersGroupedByTimeframe
    } = await this.winLoss.getDataToCalcWinLoss(
      args,
      {
        isSubAccountsTransferLedgersAdded: true,
        isMovementsWithoutSATransferLedgers: true
      }
    )

    const groupedData = await calcGroupedData(
      {
        walletsGroupedByTimeframe,
        withdrawalsGroupedByTimeframe,
        depositsGroupedByTimeframe,
        plGroupedByTimeframe,
        subAccountsTransferLedgersGroupedByTimeframe
      },
      false,
      this._winLossVSAccountBalanceByTimeframe(
        {
          isUnrealizedProfitExcluded,
          firstWalletsVals
        }
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
      plGroupedByTimeframe = {},
      subAccountsTransferLedgersGroupedByTimeframe = {}
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

      const newSATransferLedgers = Number.isFinite(subAccountsTransferLedgersGroupedByTimeframe[symb])
        ? subAccountsTransferLedgersGroupedByTimeframe[symb]
        : 0
      const areMovementsChanged = !!newSATransferLedgers

      prevMovementsRes = this.winLoss.sumMovementsWithPrevRes(
        areMovementsChanged ? {} : prevMovementsRes,
        withdrawalsGroupedByTimeframe,
        depositsGroupedByTimeframe
      )

      const movements = Number.isFinite(prevMovementsRes[symb])
        ? prevMovementsRes[symb]
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

      if (areMovementsChanged) {
        // Apply current temeframe wallets as first wallet
        firstWallets = prevWallets + newSATransferLedgers
      }

      prevWallets = wallets

      const realized = (wallets - movements) - firstWallets
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

      if (areMovementsChanged) {
        percCorrection = prevPerc
      }

      const perc = ((winLoss / firstWallets) * 100) + percCorrection
      prevPerc = perc

      return { perc }
    }
  }
}

decorateInjectable(WinLossVSAccountBalance, depsTypes)

module.exports = WinLossVSAccountBalance
