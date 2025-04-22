'use strict'

const BigNumber = require('bignumber.js')
const { setImmediate } = require('node:timers/promises')
const splitSymbolPairs = require(
  'bfx-report/workers/loc.api/helpers/split-symbol-pairs'
)

const {
  isForexSymb,
  getBackIterable
} = require('../../helpers')

const {
  CurrencyConversionError,
  CurrencyPairSeparationError
} = require('../../../errors')

const getTrxTaxType = require('./get-trx-tax-type')
const setDelistedCcyToMap = require('./set-delisted-ccy-to-map')
const getTrxFeeUsd = require('./get-trx-fee-usd')

module.exports = async (trades, opts) => {
  const {
    isBackIterativeSaleLookUp = false,
    isBackIterativeBuyLookUp = false,
    isBuyTradesWithUnrealizedProfitRequired = false,
    isNotGainOrLossRequired = false,
    interrupter,
    logger,
    delistedCcyMap
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
    if (interrupter?.hasInterrupted()) {
      return {
        saleTradesWithRealizedProfit,
        buyTradesWithUnrealizedProfit
      }
    }

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

    trade.isAdditionalTrxMovements = trade
      .isAdditionalTrxMovements ?? false

    trade.isSaleTrx = trade.isSaleTrx ?? false
    trade.isSaleTrxHistFilled = trade.isSaleTrxHistFilled ?? false
    trade.saleFilledAmount = trade
      .saleFilledAmount ?? new BigNumber(0)
    trade.costForSaleTrxUsd = trade
      .costForSaleTrxUsd ?? new BigNumber(0)
    trade.buyTrxsForRealizedProfit = trade
      .buyTrxsForRealizedProfit ?? []

    trade.isBuyTrx = trade.isBuyTrx ?? false
    trade.isBuyTrxHistFilled = trade.isBuyTrxHistFilled ?? false
    trade.buyFilledAmount = trade
      .buyFilledAmount ?? new BigNumber(0)
    trade.proceedsForBuyTrxUsd = trade
      .proceedsForBuyTrxUsd ?? new BigNumber(0)
    trade.cumulativeTrxFeesUsd = trade
      .cumulativeTrxFeesUsd ?? new BigNumber(0)
    trade.saleTrxsForRealizedProfit = trade
      .saleTrxsForRealizedProfit ?? []

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
    const isLastSymbForex = isForexSymb(lastSymb)
    const isDistinctSale = trade.execAmount < 0
    const isSaleBetweenCrypto = (
      trade.execAmount > 0 &&
      !isLastSymbForex
    )
    trade.isSaleTrx = isDistinctSale || isSaleBetweenCrypto
    trade.isBuyTrx = (
      (
        trade.execAmount > 0 ||
        !isLastSymbForex
      ) &&
      (
        !trade.isTaxablePayment ||
        !isForexSymb(firstSymb)
      )
    )

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
      throw new CurrencyPairSeparationError({
        symbol: trade.symbol,
        firstSymb,
        lastSymb
      })
    }

    const saleAmount = trade.execAmount < 0
      ? new BigNumber(trade.execAmount).abs()
      : new BigNumber(trade.execAmount)
        .times(trade.execPrice)
        .abs()
    const _salePriceUsd = isDistinctSale
      ? trade.firstSymbPriceUsd
      : trade.lastSymbPriceUsd
    const salePriceUsd = isNotGainOrLossRequired ? 0 : _salePriceUsd
    const saleAsset = isDistinctSale
      ? firstSymb
      : lastSymb

    if (!Number.isFinite(salePriceUsd)) {
      setDelistedCcyToMap({
        logger,
        delistedCcyMap,
        symbol: saleAsset,
        err: new CurrencyConversionError({
          symbol: saleAsset,
          priceUsd: salePriceUsd
        })
      })
      trade.noPriceUsd = true

      continue
    }

    trade.cumulativeTrxFeesUsd = getTrxFeeUsd(trade, opts)

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
      if (interrupter?.hasInterrupted()) {
        return {
          saleTradesWithRealizedProfit,
          buyTradesWithUnrealizedProfit
        }
      }
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
        .buyFilledAmount ?? new BigNumber(0)
      tradeForLookup.proceedsForBuyTrxUsd = tradeForLookup
        .proceedsForBuyTrxUsd ?? new BigNumber(0)
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
        throw new CurrencyPairSeparationError({
          symbol: tradeForLookup.symbol,
          firstSymb: firstSymbForLookup,
          lastSymb: lastSymbForLookup
        })
      }

      if (
        (
          tradeForLookup.execAmount < 0 &&
          isForexSymb(lastSymbForLookup)
        ) ||
        (
          tradeForLookup.isTaxablePayment &&
          isForexSymb(firstSymbForLookup)
        )
      ) {
        continue
      }

      tradeForLookup.isBuyTrx = true

      const buyAsset = tradeForLookup.execAmount > 0
        ? firstSymbForLookup
        : lastSymbForLookup

      if (saleAsset !== buyAsset) {
        continue
      }

      tradeForLookup.saleTrxsForRealizedProfit.push(trade)
      trade.buyTrxsForRealizedProfit.push(tradeForLookup)

      const buyAmount = tradeForLookup.execAmount > 0
        ? new BigNumber(tradeForLookup.execAmount).abs()
        : new BigNumber(tradeForLookup.execAmount)
          .times(tradeForLookup.execPrice)
          .abs()
      const _buyPriceUsd = tradeForLookup.execAmount > 0
        ? tradeForLookup.firstSymbPriceUsd
        : tradeForLookup.lastSymbPriceUsd
      const buyPriceUsd = isNotGainOrLossRequired ? 0 : _buyPriceUsd
      const buyRestAmount = buyAmount
        .minus(tradeForLookup.buyFilledAmount)
      const saleRestAmount = saleAmount
        .minus(trade.saleFilledAmount)

      if (!Number.isFinite(buyPriceUsd)) {
        setDelistedCcyToMap({
          logger,
          delistedCcyMap,
          symbol: buyAsset,
          err: new CurrencyConversionError({
            symbol: buyAsset,
            priceUsd: buyPriceUsd
          })
        })
        trade.noPriceUsd = true

        continue
      }

      if (buyRestAmount.lt(saleRestAmount)) {
        tradeForLookup.buyFilledAmount = buyAmount
        trade.saleFilledAmount = trade.saleFilledAmount
          .plus(buyRestAmount)
        tradeForLookup.proceedsForBuyTrxUsd = tradeForLookup
          .proceedsForBuyTrxUsd
          .plus(buyRestAmount.times(salePriceUsd))
        trade.costForSaleTrxUsd = trade.costForSaleTrxUsd
          .plus(buyRestAmount.times(buyPriceUsd))
        trade.cumulativeTrxFeesUsd = trade.cumulativeTrxFeesUsd
          .plus(getTrxFeeUsd(tradeForLookup, opts))
        tradeForLookup.isBuyTrxHistFilled = true
      }
      if (buyRestAmount.gt(saleRestAmount)) {
        tradeForLookup.buyFilledAmount = tradeForLookup
          .buyFilledAmount
          .plus(saleRestAmount)
        trade.saleFilledAmount = saleAmount
        tradeForLookup.proceedsForBuyTrxUsd = tradeForLookup
          .proceedsForBuyTrxUsd
          .plus(saleRestAmount.times(salePriceUsd))
        trade.costForSaleTrxUsd = trade.costForSaleTrxUsd
          .plus(saleRestAmount.times(buyPriceUsd))
        trade.cumulativeTrxFeesUsd = trade.cumulativeTrxFeesUsd
          .plus(getTrxFeeUsd(tradeForLookup, opts)
            .times(saleRestAmount.div(buyRestAmount))
          )
        trade.isSaleTrxHistFilled = true
      }
      if (buyRestAmount.eq(saleRestAmount)) {
        tradeForLookup.buyFilledAmount = buyAmount
        trade.saleFilledAmount = saleAmount
        tradeForLookup.proceedsForBuyTrxUsd = tradeForLookup
          .proceedsForBuyTrxUsd
          .plus(buyRestAmount.times(salePriceUsd))
        trade.costForSaleTrxUsd = trade.costForSaleTrxUsd
          .plus(buyRestAmount.times(buyPriceUsd))
        trade.cumulativeTrxFeesUsd = trade.cumulativeTrxFeesUsd
          .plus(getTrxFeeUsd(tradeForLookup, opts))
        tradeForLookup.isBuyTrxHistFilled = true
        trade.isSaleTrxHistFilled = true
      }

      if (tradeForLookup.isBuyTrxHistFilled) {
        tradeForLookup.buyAsset = buyAsset
        tradeForLookup.buyAmount = buyAmount
        tradeForLookup.mtsAcquiredForBuyTrx = tradeForLookup.mtsCreate
        tradeForLookup.mtsSoldForBuyTrx = trade.mtsCreate
        tradeForLookup.costForBuyTrxUsd = buyAmount.times(buyPriceUsd)
        tradeForLookup.gainOrLossForBuyTrxUsd = tradeForLookup
          .proceedsForBuyTrxUsd
          .minus(tradeForLookup.costForBuyTrxUsd)
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
    trade.proceedsForSaleTrxUsd = saleAmount.times(salePriceUsd)
    trade.gainOrLossUsd = trade.proceedsForSaleTrxUsd
      .minus(trade.costForSaleTrxUsd)
      .plus(trade.cumulativeTrxFeesUsd)
  }

  for (const trade of trades) {
    if (trade.noPriceUsd) {
      continue
    }
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
      (
        !trade?.isTaxablePayment &&
        (
          !trade?.isSaleTrx ||
          trade?.isAdditionalTrxMovements
        )
      )
    ) {
      continue
    }
    if (trade.isTaxablePayment) {
      const proceeds = new BigNumber(trade.execAmount)
        .times(trade.firstSymbPriceUsd)
        .plus(getTrxFeeUsd(trade, {
          shouldTaxablePaymentFlagBeSkipped: true,
          ...opts
        }))
        .toNumber()

      saleTradesWithRealizedProfit.push({
        asset: trade.firstSymb,
        amount: trade.execAmount,
        mtsAcquired: trade.mtsCreate,
        mtsSold: null,
        proceeds,
        cost: null,
        gainOrLoss: proceeds,
        type: getTrxTaxType(trade)
      })

      continue
    }

    saleTradesWithRealizedProfit.push({
      asset: trade.saleAsset,
      amount: trade.saleAmount instanceof BigNumber
        ? trade.saleAmount.toNumber()
        : 0,
      mtsAcquired: trade.mtsAcquiredForSaleTrx,
      mtsSold: trade.mtsSoldForSaleTrx,
      proceeds: trade.proceedsForSaleTrxUsd instanceof BigNumber
        ? trade.proceedsForSaleTrxUsd.toNumber()
        : 0,
      cost: trade.costForSaleTrxUsd instanceof BigNumber
        ? trade.costForSaleTrxUsd.toNumber()
        : 0,
      gainOrLoss: trade.gainOrLossUsd instanceof BigNumber
        ? trade.gainOrLossUsd.toNumber()
        : 0,
      type: getTrxTaxType(trade)
    })
  }

  return {
    saleTradesWithRealizedProfit,
    buyTradesWithUnrealizedProfit
  }
}
