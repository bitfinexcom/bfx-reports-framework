'use strict'

const { setImmediate } = require('node:timers/promises')
const {
  splitSymbolPairs
} = require('bfx-report/workers/loc.api/helpers')

const {
  isForexSymb,
  getBackIterable
} = require('../../helpers')

const {
  CurrencyConversionError,
  CurrencyPairSeparationError
} = require('../../../errors')

module.exports = async (trades, opts) => {
  const {
    isBackIterativeSaleLookUp = false,
    isBackIterativeBuyLookUp = false,
    isBuyTradesWithUnrealizedProfitRequired = false,
    isNotGainOrLossRequired = false
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
  const tradeIterator = isBackIterativeSaleLookUp
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
      (
        !isBuyTradesWithUnrealizedProfitRequired &&
        trade.execPrice === 0
      ) ||
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

    if (
      !trade.isSaleTrx ||
      trade.isBuyTradesWithUnrealizedProfitForPrevPeriod
    ) {
      continue
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
    const _salePrice = isDistinctSale
      ? trade.firstSymbPrise
      : trade.lastSymbPrise
    const salePrice = isNotGainOrLossRequired ? 0 : _salePrice
    const saleAsset = isDistinctSale
      ? firstSymb
      : lastSymb

    if (!Number.isFinite(salePrice)) {
      throw new CurrencyConversionError()
    }

    const startPoint = isBackIterativeBuyLookUp
      ? trades.length - 1
      : i + 1
    const checkPoint = (j) => (
      isBackIterativeBuyLookUp
        ? i < j
        : trades.length > j
    )
    const shiftPoint = (j) => (
      isBackIterativeBuyLookUp
        ? j - 1
        : j + 1
    )

    for (let j = startPoint; checkPoint(j); j = shiftPoint(j)) {
      if (trade.isSaleTrxHistFilled) {
        break
      }

      const tradeForLookup = trades[j]

      if (
        tradeForLookup?.isBuyTrxHistFilled ||
        !tradeForLookup?.symbol ||
        !Number.isFinite(tradeForLookup?.execAmount) ||
        tradeForLookup.execAmount === 0 ||
        !Number.isFinite(tradeForLookup?.execPrice) ||
        (
          !isBuyTradesWithUnrealizedProfitRequired &&
          tradeForLookup.execPrice === 0
        )
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
      const _buyPrice = tradeForLookup.execAmount > 0
        ? tradeForLookup.firstSymbPrise
        : tradeForLookup.lastSymbPrise
      const buyPrice = isNotGainOrLossRequired ? 0 : _buyPrice
      const buyRestAmount = buyAmount - tradeForLookup.buyFilledAmount
      const saleRestAmount = saleAmount - trade.saleFilledAmount

      if (!Number.isFinite(buyPrice)) {
        throw new CurrencyConversionError()
      }

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
        tradeForLookup.costForBuyTrx = buyAmount * buyPrice
        tradeForLookup.gainOrLossForBuyTrx = tradeForLookup.proceedsForBuyTrx - tradeForLookup.costForBuyTrx
      }
    }

    trade.saleAsset = saleAsset
    trade.saleAmount = saleAmount
    trade.mtsAcquiredForSaleTrx = (
      trade.buyTrxsForRealizedProfit[0]?.mtsCreate >
      trade.buyTrxsForRealizedProfit[trade.buyTrxsForRealizedProfit.length - 1]?.mtsCreate
    )
      ? trade.buyTrxsForRealizedProfit[trade.buyTrxsForRealizedProfit.length - 1]?.mtsCreate
      : trade.buyTrxsForRealizedProfit[0]?.mtsCreate
    trade.mtsSoldForSaleTrx = trade.mtsCreate
    trade.proceedsForSaleTrx = saleAmount * salePrice
    trade.gainOrLoss = trade.proceedsForSaleTrx - trade.costForSaleTrx
  }

  for (const trade of trades) {
    if (
      isBuyTradesWithUnrealizedProfitRequired &&
      trade?.isBuyTrx &&
      !trade?.isBuyTrxHistFilled
    ) {
      trade.isBuyTradesWithUnrealizedProfitForPrevPeriod = true
      buyTradesWithUnrealizedProfit.push(trade)
    }

    if (
      isBuyTradesWithUnrealizedProfitRequired ||
      trade?.isBuyTradesWithUnrealizedProfitForPrevPeriod ||
      !trade?.isSaleTrx ||
      trade?.isMovements
    ) {
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
