'use strict'

const { setImmediate } = require('node:timers/promises')
const {
  splitSymbolPairs
} = require('bfx-report/workers/loc.api/helpers')

const {
  isForexSymb,
  getBackIterable
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

    const isBackIterativeLookUp = true
    const { buyTradesWithUnrealizedProfit } = await this.#lookUpTrades(
      tradesForPrevPeriod, { isBackIterativeLookUp }
    )
    tradesForCurrPeriod.push(...buyTradesWithUnrealizedProfit)
    const { saleTradesWithRealizedProfit } = await this.#lookUpTrades(
      tradesForCurrPeriod, { isBackIterativeLookUp }
    )

    return saleTradesWithRealizedProfit
  }

  async #lookUpTrades (trades, opts) {
    const {
      isBackIterativeLookUp = false
    } = opts ?? {}

    const saleTradesWithRealizedProfit = []
    const buyTradesWithUnrealizedProfit = []

    if (
      !Array.isArray(trades) ||
      trades.length === 0
    ) {
      return {
        saleTradesWithRealizedProfit,
        buyTradesWithUnrealizedProfit
      }
    }

    let lastLoopUnlockMts = Date.now()
    const tradeIterator = isBackIterativeLookUp
      ? getBackIterable(trades)
      : trades

    for (const [i, trade] of tradeIterator.entries()) {
      const currentLoopUnlockMts = Date.now()

      /*
       * Trx hist restoring is a hard sync operation,
       * to prevent EventLoop locking more than 1sec
       * it needs to resolve async queue
       */
      if ((currentLoopUnlockMts - lastLoopUnlockMts) > 1000) {
        await setImmediate()

        lastLoopUnlockMts = currentLoopUnlockMts
      }

      trade.isSaleTrx = trade.isSaleTrx ?? false
      trade.isSaleTrxHistFilled = trade.isSaleTrxHistFilled ?? false
      trade.saleFilledAmount = trade.saleFilledAmount ?? 0
      trade.costForSaleTrx = trade.costForSaleTrx ?? 0
      trade.buyTrxsForRealizedProfit = trade
        .buyTrxsForRealizedProfit ?? []

      if (
        !trade?.symbol ||
        !Number.isFinite(trade?.execPrice) ||
        trade.execPrice === 0 ||
        !Number.isFinite(trade?.execAmount) ||
        trade.execAmount === 0
      ) {
        continue
      }

      const [firstSymb, lastSymb] = (
        trade?.firstSymb &&
        trade?.lastSymb
      )
        ? [trade?.firstSymb, trade?.lastSymb]
        : splitSymbolPairs(trade.symbol)
      trade.firstSymb = firstSymb
      trade.lastSymb = lastSymb

      /*
       * Exapmle of considered trxs as sale:
       *  - buy ETC:BTC -> amount 5, price 0.5 (here needs to be considered as 2 trxs: buy ETC and sale BTC)
       *  - sale ETC:BTC -> amount -2, price 0.6 (here needs to be considered as 2 trxs: sale ETC and buy BTC)
       *  - sale ETC:USD -> amount -3, price 4000
       *  - sale UST:EUR - > amount -3, price 0.9 (here needs to be considered EUR price and converted to USD)
       */
      const isDistinctSale = trade.execAmount < 0
      const isSaleBetweenCrypto = (
        trade.execAmount > 0 &&
        !isForexSymb(lastSymb)
      )
      trade.isSaleTrx = isDistinctSale || isSaleBetweenCrypto

      if (!trade.isSaleTrx) {
        continue
      }
      if (!Number.isFinite(trade.amountUsd)) {
        throw new CurrencyConversionError()
      }
      if (
        !firstSymb ||
        !lastSymb
      ) {
        throw new CurrencyPairSeparationError()
      }

      const saleAmount = trade.execAmount < 0
        ? Math.abs(trade.execAmount)
        : Math.abs(trade.execAmount * trade.execPrice)
      const salePrice = Math.abs(trade.amountUsd) / saleAmount
      const saleAsset = isDistinctSale
        ? firstSymb
        : lastSymb

      for (const [j, tradeForLookup] of trades.entries()) {
        if (j <= i) {
          continue
        }
        if (trade.isSaleTrxHistFilled) {
          break
        }
        if (
          tradeForLookup?.isBuyTrxHistFilled ||
          !tradeForLookup?.symbol ||
          !Number.isFinite(tradeForLookup?.execAmount) ||
          tradeForLookup.execAmount === 0 ||
          !Number.isFinite(tradeForLookup?.execPrice) ||
          tradeForLookup.execPrice === 0
        ) {
          continue
        }

        tradeForLookup.isBuyTrx = tradeForLookup.isBuyTrx ?? false
        tradeForLookup.isBuyTrxHistFilled = tradeForLookup
          .isBuyTrxHistFilled ?? false
        tradeForLookup.buyFilledAmount = tradeForLookup
          .buyFilledAmount ?? 0
        tradeForLookup.proceedsForBuyTrx = tradeForLookup.proceedsForBuyTrx ?? 0
        tradeForLookup.saleTrxsForRealizedProfit = tradeForLookup
          .saleTrxsForRealizedProfit ?? []

        const [firstSymbForLookup, lastSymbForLookup] = (
          tradeForLookup?.firstSymb &&
          tradeForLookup?.lastSymb
        )
          ? [tradeForLookup?.firstSymb, tradeForLookup?.lastSymb]
          : splitSymbolPairs(tradeForLookup.symbol)
        tradeForLookup.firstSymb = firstSymbForLookup
        tradeForLookup.lastSymb = lastSymbForLookup

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

        const buyAsset = tradeForLookup.execAmount > 0
          ? firstSymbForLookup
          : lastSymbForLookup

        if (saleAsset !== buyAsset) {
          continue
        }

        tradeForLookup.isBuyTrx = true
        tradeForLookup.saleTrxsForRealizedProfit.push(trade)
        trade.buyTrxsForRealizedProfit.push(tradeForLookup)

        const buyAmount = tradeForLookup.execAmount > 0
          ? Math.abs(tradeForLookup.execAmount)
          : Math.abs(tradeForLookup.execAmount * tradeForLookup.execPrice)
        const buyPrice = Math.abs(tradeForLookup.amountUsd) / buyAmount
        const buyRestAmount = buyAmount - tradeForLookup.buyFilledAmount
        const saleRestAmount = saleAmount - trade.saleFilledAmount

        if (buyRestAmount < saleRestAmount) {
          tradeForLookup.buyFilledAmount = buyAmount
          trade.saleFilledAmount += buyRestAmount
          tradeForLookup.proceedsForBuyTrx += buyRestAmount * salePrice
          trade.costForSaleTrx += buyRestAmount * buyPrice
          tradeForLookup.isBuyTrxHistFilled = true
        }
        if (buyRestAmount > saleRestAmount) {
          tradeForLookup.buyFilledAmount += saleRestAmount
          trade.saleFilledAmount = saleAmount
          tradeForLookup.proceedsForBuyTrx += saleRestAmount * salePrice
          trade.costForSaleTrx += saleRestAmount * buyPrice
          trade.isSaleTrxHistFilled = true
        }
        if (buyRestAmount === saleRestAmount) {
          tradeForLookup.buyFilledAmount = buyAmount
          trade.saleFilledAmount = saleAmount
          tradeForLookup.proceedsForBuyTrx += buyRestAmount * salePrice
          trade.costForSaleTrx += buyRestAmount * buyPrice
          tradeForLookup.isBuyTrxHistFilled = true
          trade.isSaleTrxHistFilled = true
        }

        if (tradeForLookup.isBuyTrxHistFilled) {
          tradeForLookup.buyAsset = buyAsset
          tradeForLookup.buyAmount = buyAmount
          tradeForLookup.mtsAcquiredForBuyTrx = tradeForLookup.mtsCreate
          tradeForLookup.mtsSoldForBuyTrx = trade.mtsCreate
          tradeForLookup.costForBuyTrx = Math.abs(tradeForLookup.amountUsd)
          tradeForLookup.gainOrLossForBuyTrx = tradeForLookup.proceedsForBuyTrx - tradeForLookup.costForBuyTrx
        }
      }

      if (trade.isSaleTrxHistFilled) {
        trade.saleAsset = saleAsset
        trade.saleAmount = saleAmount
        trade.mtsAcquiredForSaleTrx = (
          trade.buyTrxsForRealizedProfit[0]?.mtsCreate >
          trade.buyTrxsForRealizedProfit[trade.buyTrxsForRealizedProfit.length - 1]?.mtsCreate
        )
          ? trade.buyTrxsForRealizedProfit[trade.buyTrxsForRealizedProfit.length - 1]?.mtsCreate
          : trade.buyTrxsForRealizedProfit[0]?.mtsCreate
        trade.mtsSoldForSaleTrx = trade.mtsCreate
        trade.proceedsForSaleTrx = Math.abs(trade.amountUsd)
        trade.gainOrLoss = trade.proceedsForSaleTrx - trade.costForSaleTrx
      }
    }

    for (const trade of trades) {
      if (
        trade?.isBuyTrx &&
        !trade?.isBuyTrxHistFilled
      ) {
        buyTradesWithUnrealizedProfit.push(trade)
      }

      if (!trade?.isSaleTrxHistFilled) {
        continue
      }

      saleTradesWithRealizedProfit.push({
        asset: trade.saleAsset,
        amount: trade.saleAmount,
        mtsAcquired: trade.mtsAcquiredForSaleTrx,
        mtsSold: trade.mtsSoldForSaleTrx,
        proceeds: trade.proceedsForSaleTrx,
        cost: trade.costForSaleTrx,
        gainOrLoss: trade.gainOrLoss
      })
    }

    return {
      saleTradesWithRealizedProfit,
      buyTradesWithUnrealizedProfit
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
