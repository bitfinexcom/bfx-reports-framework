'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../../di/types')
const {
  addPropsToResIfExist,
  getFlagsFromLedgerDescription
} = require('./helpers')

class ApiMiddlewareHandlerAfter {
  constructor (
    searchClosePriceAndSumAmount
  ) {
    this.searchClosePriceAndSumAmount = searchClosePriceAndSumAmount
  }

  async _getPositionsHistory (
    args,
    apiRes,
    isCheckCall
  ) {
    if (isCheckCall) {
      return apiRes
    }

    const res = []

    for (const position of apiRes.res) {
      const {
        basePrice,
        symbol,
        mtsUpdate: end,
        id
      } = { ...position }

      if (
        !symbol ||
        typeof symbol !== 'string' ||
        /tBFX/gi.test(symbol) ||
        !Number.isInteger(end) ||
        !Number.isInteger(id) ||
        !Number.isFinite(basePrice)
      ) {
        res.push({
          ...position,
          closePrice: null
        })

        continue
      }

      const {
        closePrice,
        sumAmount
      } = await this.searchClosePriceAndSumAmount({
        args,
        symbol,
        end,
        id
      })

      if (
        !Number.isFinite(closePrice) ||
        !Number.isFinite(sumAmount)
      ) {
        res.push({
          ...position,
          closePrice,
          pl: null,
          plPerc: null
        })

        continue
      }

      const pl = (closePrice - basePrice) * sumAmount
      const plPerc = ((closePrice / basePrice) - 1) * 100 * Math.sign(sumAmount)

      res.push({
        ...position,
        closePrice,
        pl,
        plPerc
      })
    }

    return {
      ...apiRes,
      res
    }
  }

  _getPublicTrades (args, apiRes) {
    return addPropsToResIfExist(
      args,
      apiRes,
      [{ from: 'symbol', to: '_symbol' }]
    )
  }

  _getLedgers (args, apiRes) {
    const res = apiRes.res.map(item => {
      const { balance } = { ...item }

      return {
        ...item,
        ...getFlagsFromLedgerDescription(
          item,
          [
            {
              fieldName: '_isMarginFundingPayment',
              pattern: 'Margin Funding Payment'
            },
            {
              fieldName: '_isAffiliateRebate',
              pattern: 'Affiliate Rebate'
            },
            {
              fieldName: '_isStakingPayments',
              pattern: 'Staking Payments'
            }
          ]
        ),
        _nativeBalance: balance
      }
    })

    return {
      ...apiRes,
      res
    }
  }

  _getCandles (args, apiRes) {
    return addPropsToResIfExist(
      args,
      apiRes,
      [
        { from: 'symbol', to: '_symbol' },
        { from: 'timeframe', to: '_timeframe' }
      ]
    )
  }

  _getStatusMessages (args, apiRes) {
    return addPropsToResIfExist(
      args,
      apiRes,
      [{ from: 'type', to: '_type' }]
    )
  }
}

decorate(injectable(), ApiMiddlewareHandlerAfter)
decorate(inject(TYPES.SearchClosePriceAndSumAmount), ApiMiddlewareHandlerAfter, 0)

module.exports = ApiMiddlewareHandlerAfter
