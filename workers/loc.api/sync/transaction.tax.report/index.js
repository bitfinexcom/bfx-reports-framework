'use strict'

const INTERRUPTER_NAMES = require(
  'bfx-report/workers/loc.api/interrupter/interrupter.names'
)

const { pushLargeArr } = require('../../helpers/utils')
const { getBackIterable } = require('../helpers')
const { PubTradeFindForTrxTaxError } = require('../../errors')

const {
  TRX_TAX_STRATEGIES,
  remapTrades,
  remapMovements,
  lookUpTrades,
  getTrxMapByCcy,
  findPublicTrade
} = require('./helpers')

const isTestEnv = process.env.NODE_ENV === 'test'

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.Authenticator,
  TYPES.SyncSchema,
  TYPES.ALLOWED_COLLS,
  TYPES.SYNC_API_METHODS,
  TYPES.Movements,
  TYPES.RService,
  TYPES.GetDataFromApi,
  TYPES.WSEventEmitterFactory,
  TYPES.Logger,
  TYPES.InterrupterFactory,
  TYPES.CurrencyConverter
]
class TransactionTaxReport {
  constructor (
    dao,
    authenticator,
    syncSchema,
    ALLOWED_COLLS,
    SYNC_API_METHODS,
    movements,
    rService,
    getDataFromApi,
    wsEventEmitterFactory,
    logger,
    interrupterFactory,
    currencyConverter
  ) {
    this.dao = dao
    this.authenticator = authenticator
    this.syncSchema = syncSchema
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.movements = movements
    this.rService = rService
    this.getDataFromApi = getDataFromApi
    this.wsEventEmitterFactory = wsEventEmitterFactory
    this.logger = logger
    this.interrupterFactory = interrupterFactory
    this.currencyConverter = currencyConverter

    this.tradesModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.TRADES)
  }

  async makeTrxTaxReportInBackground (args = {}) {
    const { auth, params } = args ?? {}
    const user = await this.authenticator
      .verifyRequestUser({ auth })
    const _args = { auth: user, params }

    this.wsEventEmitterFactory()
      .emitTrxTaxReportGenerationInBackgroundToOne(() => {
        return this.getTransactionTaxReport(_args)
      }, user)
      .then(() => {}, (err) => {
        this.logger.error(`TRX_TAX_REPORT_GEN_FAILED: ${err.stack || err}`)
      })

    return true
  }

  async getTransactionTaxReport (args = {}) {
    const { auth, params } = args ?? {}
    const start = params.start ?? 0
    const end = params.end ?? Date.now()
    const strategy = params.strategy ?? TRX_TAX_STRATEGIES.LIFO
    const user = await this.authenticator
      .verifyRequestUser({ auth })
    const interrupter = this.interrupterFactory({
      user,
      name: INTERRUPTER_NAMES.TRX_TAX_REPORT_INTERRUPTER
    })

    const isFIFO = strategy === TRX_TAX_STRATEGIES.FIFO
    const isLIFO = strategy === TRX_TAX_STRATEGIES.LIFO

    const {
      trxs: trxsForCurrPeriod,
      trxsForConvToUsd
    } = await this.#getTrxs({
      user,
      start,
      end
    })

    if (
      !Array.isArray(trxsForCurrPeriod) ||
      trxsForCurrPeriod.length === 0
    ) {
      interrupter.emitInterrupted()

      return []
    }

    const {
      trxs: trxsForPrevPeriod
    } = start > 0
      ? await this.#getTrxs({
        user,
        start: 0,
        end: start - 1
      })
      : { trxs: [] }

    const isBackIterativeSaleLookUp = isFIFO && !isLIFO
    const isBackIterativeBuyLookUp = isFIFO && !isLIFO

    const { buyTradesWithUnrealizedProfit } = await lookUpTrades(
      trxsForPrevPeriod,
      {
        isBackIterativeSaleLookUp,
        isBackIterativeBuyLookUp,
        isBuyTradesWithUnrealizedProfitRequired: true,
        isNotGainOrLossRequired: true,
        interrupter
      }
    )

    pushLargeArr(trxsForCurrPeriod, buyTradesWithUnrealizedProfit)
    pushLargeArr(
      trxsForConvToUsd,
      buyTradesWithUnrealizedProfit
        .filter((trx) => (
          !Number.isFinite(trx?.firstSymbPriceUsd) ||
          !Number.isFinite(trx?.lastSymbPriceUsd)
        ))
    )
    await this.#convertCurrencies(trxsForConvToUsd, { interrupter })

    const { saleTradesWithRealizedProfit } = await lookUpTrades(
      trxsForCurrPeriod,
      {
        isBackIterativeSaleLookUp,
        isBackIterativeBuyLookUp,
        interrupter
      }
    )

    interrupter.emitInterrupted()

    if (interrupter.hasInterrupted()) {
      return []
    }

    return saleTradesWithRealizedProfit
  }

  async #getTrxs (params) {
    const {
      user,
      start,
      end
    } = params ?? {}

    const tradesPromise = this.#getTrades(params)
    const withdrawalsPromise = this.movements.getMovements({
      auth: user,
      start,
      end,
      isWithdrawals: true,
      isExcludePrivate: false
    })
    const depositsPromise = this.movements.getMovements({
      auth: user,
      start,
      end,
      isDeposits: true,
      isExcludePrivate: false
    })

    const [
      trades,
      withdrawals,
      deposits
    ] = await Promise.all([
      tradesPromise,
      withdrawalsPromise,
      depositsPromise
    ])

    const movements = [...withdrawals, ...deposits]
    const remappedTrxs = []
    const remappedTrxsForConvToUsd = []

    remapTrades(
      trades,
      { remappedTrxs, remappedTrxsForConvToUsd }
    )
    remapMovements(
      movements,
      { remappedTrxs, remappedTrxsForConvToUsd }
    )

    const trxs = remappedTrxs
      .sort((a, b) => b?.mtsCreate - a?.mtsCreate)
    const trxsForConvToUsd = remappedTrxsForConvToUsd
      .sort((a, b) => b?.mtsCreate - a?.mtsCreate)

    return {
      trxs,
      trxsForConvToUsd
    }
  }

  async #convertCurrencies (trxs, opts) {
    const { interrupter } = opts
    const trxMapByCcy = getTrxMapByCcy(trxs)

    for (const [symbol, trxPriceCalculators] of trxMapByCcy.entries()) {
      if (interrupter.hasInterrupted()) {
        return
      }

      const trxPriceCalculatorIterator = getBackIterable(trxPriceCalculators)
      const symbSeparator = symbol.length > 3
        ? ':'
        : ''

      let pubTrades = []
      let pubTradeStart = pubTrades[0]?.mts
      let pubTradeEnd = pubTrades[pubTrades.length - 1]?.mts

      for (const trxPriceCalculator of trxPriceCalculatorIterator) {
        if (interrupter.hasInterrupted()) {
          return
        }

        const { trx } = trxPriceCalculator

        if (
          pubTrades.length === 0 ||
          pubTradeStart > trx.mtsCreate ||
          pubTradeEnd < trx.mtsCreate
        ) {
          const start = trx.mtsCreate - 1

          pubTrades = await this.#getPublicTrades(
            { symbol: `t${symbol}${symbSeparator}USD`, start },
            opts
          )

          if (
            !Array.isArray(pubTrades) ||
            pubTrades.length === 0
          ) {
            const ccySynonymous = await this.currencyConverter
              .getCurrenciesSynonymous()
            const synonymous = ccySynonymous.get(symbol)

            if (!synonymous) {
              throw new PubTradeFindForTrxTaxError({
                symbol,
                pubTradeStart,
                pubTradeEnd,
                requiredMts: trx.mtsCreate
              })
            }

            for (const [symbol, conversion] of synonymous) {
              const symbSeparator = symbol.length > 3
                ? ':'
                : ''
              const res = await this.#getPublicTrades(
                { symbol: `t${symbol}${symbSeparator}USD`, start },
                opts
              )

              if (
                !Array.isArray(res) ||
                res.length === 0
              ) {
                continue
              }

              pubTrades = res.map((item) => {
                if (Number.isFinite(item?.price)) {
                  item.price = item.price * conversion
                }

                return item
              })

              break
            }
          }

          pubTradeStart = start ?? pubTrades[0]?.mts
          pubTradeEnd = pubTrades[pubTrades.length - 1]?.mts
        }

        if (
          !Array.isArray(pubTrades) ||
          pubTrades.length === 0 ||
          !Number.isFinite(pubTradeStart) ||
          !Number.isFinite(pubTradeEnd) ||
          pubTradeStart > trx.mtsCreate ||
          pubTradeEnd < trx.mtsCreate
        ) {
          throw new PubTradeFindForTrxTaxError({
            symbol,
            pubTradeStart,
            pubTradeEnd,
            requiredMts: trx.mtsCreate
          })
        }

        const pubTrade = findPublicTrade(pubTrades, trx.mtsCreate)
        trxPriceCalculator.calcPrice(pubTrade?.price)
      }
    }

    await this.#updateExactUsdValueInColls(trxs)
  }

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
        isExcludePrivate: false
      }
    )
  }

  async #getPublicTrades (params, opts) {
    const {
      symbol,
      start = 0,
      end = Date.now(),
      sort = 1,
      limit = 10000
    } = params ?? {}
    const { interrupter } = opts ?? {}
    const args = {
      isNotMoreThanInnerMax: true,
      params: {
        symbol,
        start,
        end,
        sort,
        limit,
        notCheckNextPage: true,
        notThrowError: true
      }
    }

    const getDataFn = this.rService[this.SYNC_API_METHODS.PUBLIC_TRADES]
      .bind(this.rService)

    const { res } = await this.getDataFromApi({
      getData: (s, args) => getDataFn(args),
      args,
      callerName: 'TRANSACTION_TAX_REPORT',
      eNetErrorAttemptsTimeframeMin: 10,
      eNetErrorAttemptsTimeoutMs: 10000,
      interrupter
    })

    if (isTestEnv) {
      /*
       * Need to reverse pub-trades array for test env
       * as mocked test server return data in desc order
       */
      return res.reverse()
    }

    return res
  }

  async #updateExactUsdValueInColls (trxs) {
    let trades = []
    let movements = []
    let ledgers = []

    for (const [i, trx] of trxs.entries()) {
      const isLast = (i + 1) === trxs.length

      if (trx.isTrades) {
        trades.push(trx)
      }
      if (trx.isMovements) {
        movements.push(trx)
      }
      if (trx.isLedgers) {
        ledgers.push(trx)
      }

      if (
        trades.length >= 20_000 ||
        isLast
      ) {
        await this.dao.updateElemsInCollBy(
          this.ALLOWED_COLLS.TRADES,
          trades,
          ['_id'],
          ['exactUsdValue']
        )

        trades = []
      }
      if (
        movements.length >= 20_000 ||
        isLast
      ) {
        await this.dao.updateElemsInCollBy(
          this.ALLOWED_COLLS.MOVEMENTS,
          movements,
          ['_id'],
          ['exactUsdValue']
        )

        movements = []
      }
      if (
        ledgers.length >= 20_000 ||
        isLast
      ) {
        await this.dao.updateElemsInCollBy(
          this.ALLOWED_COLLS.LEDGERS,
          ledgers,
          ['_id'],
          ['exactUsdValue']
        )

        ledgers = []
      }
    }
  }
}

decorateInjectable(TransactionTaxReport, depsTypes)

module.exports = TransactionTaxReport
