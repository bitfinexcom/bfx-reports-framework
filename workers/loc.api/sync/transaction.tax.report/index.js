'use strict'

const { pick } = require('lib-js-util-base')
const {
  splitSymbolPairs
} = require('bfx-report/workers/loc.api/helpers')

const {
  isForexSymb
} = require('../helpers')
const {
  CurrencyConversionError,
  CurrencyPairSeparationError
} = require('../../errors')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.Authenticator,
  TYPES.SyncSchema,
  TYPES.ALLOWED_COLLS,
  TYPES.SYNC_API_METHODS,
  TYPES.Trades
]
class TransactionTaxReport {
  constructor (
    dao,
    authenticator,
    syncSchema,
    ALLOWED_COLLS,
    SYNC_API_METHODS,
    trades
  ) {
    this.dao = dao
    this.authenticator = authenticator
    this.syncSchema = syncSchema
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.trades = trades

    this.tradesMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.TRADES)
    this.tradesModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.TRADES)
  }

  async getTransactionTaxReport (args = {}) {
    const { auth, params } = args ?? {}
    const {
      start = 0,
      end = Date.now()
    } = params ?? {}
    const user = await this.authenticator
      .verifyRequestUser({ auth })

    const tradesForCurrPeriod = await this.trades.getTrades({
      auth: user,
      params: {
        start,
        end
      }
    })

    if (
      !Array.isArray(tradesForCurrPeriod) ||
      tradesForCurrPeriod.length === 0
    ) {
      return []
    }

    const tradesForPrevPeriod = start > 0
      ? await this.trades.getTrades({
        auth: user,
        params: {
          start: 0,
          end: start - 1
        }
      })
      : []

    const { tradesWithUnrealizedProfit } = await this.#lookUpTrades(
      tradesForPrevPeriod
    )
    tradesForCurrPeriod.push(...tradesWithUnrealizedProfit)
    const { tradesWithRealizedProfit } = await this.#lookUpTrades(
      tradesForCurrPeriod
    )

    return tradesWithRealizedProfit
  }

  async #lookUpTrades (trades) {
    if (
      !Array.isArray(trades) ||
      trades.length === 0
    ) {
      return []
    }

    const tradesWithRealizedProfit = []
    const tradesWithUnrealizedProfit = []

    if (
      !Array.isArray(trades) ||
      trades.length === 0
    ) {
      return {
        tradesWithRealizedProfit,
        tradesWithUnrealizedProfit
      }
    }

    for (const [i, trade] of trades.entries()) {
      const {
        symbol,
        execPrice,
        execAmount,
        amountUsd // cacled amount: `execAmount * execPrice`, if lastSymb is not USD it converts to USD
      } = trade ?? {}

      let isSaleTrx = false
      let isSaleTrxHistFilled = false
      let saleFilledAmount = 0
      const buyTrxsForRealizedProfit = []

      if (
        !symbol ||
        !Number.isFinite(execPrice) ||
        execPrice === 0 ||
        !Number.isFinite(execAmount) ||
        execAmount === 0
      ) {
        continue
      }

      const [firstSymb, lastSymb] = splitSymbolPairs(symbol)

      /*
       * Exapmle of considered trxs as sale:
       *  - buy ETC:BTC -> amount 5, price 0.5 (here needs to be considered as 2 trxs: buy ETC and sale BTC)
       *  - sale ETC:BTC -> amount -2, price 0.6 (here needs to be considered as 2 trxs: sale ETC and buy BTC)
       *  - sale ETC:USD -> amount -3, price 4000
       *  - sale UST:EUR - > amount -3, price 0.9 (here needs to be considered EUR price and converted to USD)
       */
      const isDistinctSale = execAmount < 0
      const isSaleBetweenCrypto = (
        execAmount > 0 &&
        !isForexSymb(lastSymb)
      )
      isSaleTrx = isDistinctSale || isSaleBetweenCrypto

      if (isSaleTrx) {
        if (!Number.isFinite(amountUsd)) {
          throw new CurrencyConversionError()
        }
        if (
          !firstSymb ||
          !lastSymb
        ) {
          throw new CurrencyPairSeparationError()
        }

        const saleAmount = execAmount < 0
          ? Math.abs(execAmount)
          : Math.abs(execAmount * execPrice)
        const salePrice = Math.abs(amountUsd) / saleAmount
        const saleAsset = isDistinctSale
          ? firstSymb
          : lastSymb

        for (const [j, tradeForLookup] of trades.entries()) {
          let {
            isBuyTrx = false,
            isBuyTrxHistFilled = false,
            isRealizedProfitDetected = false,
            buyFilledAmount = 0,
            proceeds = 0
          } = tradeForLookup ?? {}
          const saleTrxsForRealizedProfit = tradeForLookup
            ?.saleTrxsForRealizedProfit ?? []

          if (isSaleTrxHistFilled) {
            break
          }
          if (
            j <= i ||
            isBuyTrxHistFilled ||
            !symbol ||
            !Number.isFinite(tradeForLookup?.execAmount) ||
            tradeForLookup.execAmount === 0 ||
            !Number.isFinite(tradeForLookup.execPrice) ||
            tradeForLookup.execPrice === 0
          ) {
            continue
          }

          const [
            firstSymbForLookup,
            lastSymbForLookup
          ] = splitSymbolPairs(tradeForLookup.symbol)

          if (!Number.isFinite(tradeForLookup.amountUsd)) {
            throw new CurrencyConversionError()
          }
          if (
            !firstSymbForLookup ||
            !lastSymbForLookup
          ) {
            throw new CurrencyPairSeparationError()
          }

          if (
            tradeForLookup.execAmount < 0 &&
            isForexSymb(lastSymbForLookup)
          ) {
            continue
          }

          const asset = tradeForLookup.execAmount > 0
            ? firstSymbForLookup
            : lastSymbForLookup

          if (saleAsset !== asset) {
            continue
          }

          isBuyTrx = true
          saleTrxsForRealizedProfit.push(trade)
          buyTrxsForRealizedProfit.push(tradeForLookup)

          const buyAmount = tradeForLookup.execAmount > 0
            ? Math.abs(tradeForLookup.execAmount)
            : Math.abs(tradeForLookup.execAmount * tradeForLookup.execPrice)
          const buyRestAmount = buyAmount - buyFilledAmount
          const saleRestAmount = saleAmount - saleFilledAmount

          if (buyRestAmount < saleRestAmount) {
            buyFilledAmount = buyAmount
            saleFilledAmount += buyRestAmount
            proceeds += buyRestAmount * salePrice
            isRealizedProfitDetected = true
            isBuyTrxHistFilled = true
          }
          if (buyRestAmount > saleRestAmount) {
            buyFilledAmount += saleRestAmount
            saleFilledAmount = saleAmount
            proceeds += saleRestAmount * salePrice
            isSaleTrxHistFilled = true
          }
          if (buyRestAmount === saleRestAmount) {
            buyFilledAmount = buyAmount
            saleFilledAmount = saleAmount
            proceeds += buyRestAmount * salePrice
            isRealizedProfitDetected = true
            isBuyTrxHistFilled = true
            isSaleTrxHistFilled = true
          }

          tradeForLookup.isBuyTrx = isBuyTrx
          tradeForLookup.isBuyTrxHistFilled = isBuyTrxHistFilled
          tradeForLookup.isRealizedProfitDetected = isRealizedProfitDetected
          tradeForLookup.buyFilledAmount = buyFilledAmount
          tradeForLookup.proceeds = proceeds
          tradeForLookup.saleTrxsForRealizedProfit = saleTrxsForRealizedProfit

          if (isRealizedProfitDetected) {
            tradeForLookup.asset = asset
            tradeForLookup.amount = Math.abs(tradeForLookup.execAmount)
            tradeForLookup.mtsAcquired = tradeForLookup.mtsCreate
            tradeForLookup.mtsSold = trade.mtsCreate
            tradeForLookup.cost = Math.abs(tradeForLookup.amountUsd)
            tradeForLookup.gainOrLoss = proceeds - tradeForLookup.cost

            tradesWithRealizedProfit.push(
              pick(tradeForLookup, [
                'asset',
                'amount',
                'mtsAcquired',
                'mtsSold',
                'proceeds',
                'cost',
                'gainOrLoss'
              ])
            )
          }
        }
      }

      trade.isSaleTrx = isSaleTrx
      trade.isSaleTrxHistFilled = isSaleTrxHistFilled
      trade.saleFilledAmount = saleFilledAmount
      trade.buyTrxsForRealizedProfit = buyTrxsForRealizedProfit
    }

    for (const trade of trades) {
      if (
        !trade?.isBuyTrx ||
        trade?.isRealizedProfitDetected
      ) {
        continue
      }

      tradesWithUnrealizedProfit.push(trade)
    }

    /*
     * Data structure examples:
     *   - for tradesWithRealizedProfit:
     *     [{
     *       asset: 'BTC',
     *       amount: 0.001,
     *       mtsAcquired: Date.now(),
     *       mtsSold: Date.now(),
     *       proceeds: 2.86,
     *       cost: 26.932,
     *       gainOrLoss: -24.072
     *     }]
     *
     *   - for tradesWithUnrealizedProfit:
     *     [{
     *       ...trade,
     *       isBuyTrx: true,
     *       isBuyTrxHistFilled: false,
     *       isRealizedProfitDetected: false,
     *       buyFilledAmount: 0.001,
     *       proceeds: 2.86,
     *       saleTrxsForRealizedProfit: []
     *     }]
     */
    return {
      tradesWithRealizedProfit,
      tradesWithUnrealizedProfit
    }
  }

  // TODO:
  async #getTrades ({
    user,
    start,
    end,
    symbol
  }) {
    const symbFilter = (
      Array.isArray(symbol) &&
      symbol.length !== 0
    )
      ? { $in: { symbol } }
      : {}

    return this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.TRADES,
      {
        filter: {
          user_id: user._id,
          $lte: { mtsCreate: end },
          $gte: { mtsCreate: start },
          ...symbFilter
        },
        sort: [['mtsCreate', -1]],
        projection: this.tradesModel,
        exclude: ['user_id'],
        isExcludePrivate: true
      }
    )
  }
}

decorateInjectable(TransactionTaxReport, depsTypes)

module.exports = TransactionTaxReport
