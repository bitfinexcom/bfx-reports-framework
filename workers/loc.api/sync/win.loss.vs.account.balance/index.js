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
      this._getWinLossByTimeframe(
        { isUnrealizedProfitExcluded }
      ),
      true
    )
    groupedData.push({
      mts: start,
      USD: 0
    })
    const res = this.winLoss.shiftMtsToNextTimeframe(
      groupedData,
      { timeframe, end }
    )

    return res
  }

  // TODO:
  _getWinLossByTimeframe ({ isUnrealizedProfitExcluded }) {
    return ({
      walletsGroupedByTimeframe = {},
      withdrawalsGroupedByTimeframe = {},
      depositsGroupedByTimeframe = {},
      plGroupedByTimeframe = {}
    } = {}, i, arr) => {}
  }
}

decorateInjectable(WinLossVSAccountBalance, depsTypes)

module.exports = WinLossVSAccountBalance
