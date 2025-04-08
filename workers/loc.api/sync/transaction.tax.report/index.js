'use strict'

const { setTimeout } = require('node:timers/promises')

const INTERRUPTER_NAMES = require(
  'bfx-report/workers/loc.api/interrupter/interrupter.names'
)

const { pushLargeArr } = require('../../helpers/utils')
const { PubTradeFindForTrxTaxError } = require('../../errors')

const {
  TRX_TAX_STRATEGIES,
  PROGRESS_STATES,
  remapTrades,
  remapMovements,
  lookUpTrades,
  getTrxMapByCcy,
  findPublicTrade,
  getCcyPairForConversion,
  calcMarginAndDerivTrxs
} = require('./helpers')

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
  TYPES.CurrencyConverter,
  TYPES.ProcessMessageManager
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
    currencyConverter,
    processMessageManager
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
    this.processMessageManager = processMessageManager

    this.tradesModelFields = this.syncSchema
      .getModelOf(this.ALLOWED_COLLS.TRADES)
      .getModelFields()
  }

  async makeTrxTaxReportInBackground (args = {}) {
    const { auth, params } = args ?? {}
    const user = await this.authenticator
      .verifyRequestUser({ auth })
    const _args = { auth: user, params }

    const trxTaxReportPromise = this.getTransactionTaxReport(_args)

    this.wsEventEmitterFactory()
      .emitTrxTaxReportGenerationInBackgroundToOne(() => {
        return trxTaxReportPromise
      }, user)
      .then(() => {}, (err) => {
        this.logger.error(`TRX_TAX_REPORT_GEN_FAILED: ${err.stack || err}`)
      })

    trxTaxReportPromise.catch(() => {
      this.processMessageManager.sendState(
        this.processMessageManager.PROCESS_MESSAGES.ERROR_TRX_TAX_REPORT
      )
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
    await this.#emitProgress(
      user,
      { progress: 0, state: PROGRESS_STATES.GENERATION_STARTED }
    )

    const isFIFO = strategy === TRX_TAX_STRATEGIES.FIFO
    const isLIFO = strategy === TRX_TAX_STRATEGIES.LIFO

    const {
      exchangeTrxs: trxsForCurrPeriod,
      marginAndDerivTrxs,
      trxsForConvToUsd
    } = await this.#getTrxs({
      user,
      start,
      end
    })

    if (
      trxsForCurrPeriod.length === 0 &&
      marginAndDerivTrxs.length === 0
    ) {
      interrupter.emitInterrupted()
      await this.#emitProgress(
        user,
        { progress: 100, state: PROGRESS_STATES.GENERATION_COMPLETED }
      )

      return []
    }

    const {
      exchangeTrxs: trxsForPrevPeriod,
      marginAndDerivTrxs: marginAndDerivTrxsForPrevPeriod,
      marginAndDerivTrxsForConvToUsd: marginAndDerivTrxsForPrevPeriodForConvToUsd
    } = await this.#getTrxs({
      user,
      start: 0,
      end: start - 1,
      shouldNotExchangeTradesBeFetched: (
        start <= 0 ||
        trxsForCurrPeriod.length === 0
      ),
      shouldNotMarginAndDerivTradesBeFetched: (
        start <= 0 ||
        marginAndDerivTrxs.length === 0
      )
    })

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
      marginAndDerivTrxsForPrevPeriodForConvToUsd,
      buyTradesWithUnrealizedProfit
        .filter((trx) => (
          !Number.isFinite(trx?.firstSymbPriceUsd) ||
          !Number.isFinite(trx?.lastSymbPriceUsd)
        ))
    )
    const trxsForPrevPeriodForConvToUsd = marginAndDerivTrxsForPrevPeriodForConvToUsd
      .sort((a, b) => b?.mtsCreate - a?.mtsCreate)
    pushLargeArr(
      trxsForConvToUsd,
      trxsForPrevPeriodForConvToUsd
    )
    await this.#convertCurrencies(
      trxsForConvToUsd,
      { interrupter, user }
    )

    const { saleTradesWithRealizedProfit } = await lookUpTrades(
      trxsForCurrPeriod,
      {
        isBackIterativeSaleLookUp,
        isBackIterativeBuyLookUp,
        interrupter
      }
    )
    const {
      mapOfLastProcessedTradesByPairsWithUnrealizedProfit
    } = await calcMarginAndDerivTrxs(
      marginAndDerivTrxsForPrevPeriod,
      { interrupter, isUnrealizedProfitForPrevPeriod: true }
    )
    const {
      res: marginAndDerivTrxsWithRealizedProfit
    } = await calcMarginAndDerivTrxs(
      marginAndDerivTrxs,
      {
        interrupter,
        mapOfLastProcessedTradesByPairsWithUnrealizedProfit
      }
    )
    pushLargeArr(
      saleTradesWithRealizedProfit,
      marginAndDerivTrxsWithRealizedProfit
    )

    if (interrupter.hasInterrupted()) {
      interrupter.emitInterrupted()
      await this.#emitProgress(
        user,
        { progress: null, state: PROGRESS_STATES.GENERATION_INTERRUPTED }
      )

      return []
    }

    interrupter.emitInterrupted()
    await this.#emitProgress(
      user,
      { progress: 100, state: PROGRESS_STATES.GENERATION_COMPLETED }
    )

    return saleTradesWithRealizedProfit
  }

  async #getTrxs (params) {
    const {
      user,
      start,
      end,
      shouldNotExchangeTradesBeFetched
    } = params ?? {}

    const tradesPromise = this.#getTrades(params)
    const withdrawalsPromise = shouldNotExchangeTradesBeFetched
      ? []
      : this.movements.getMovements({
        auth: user,
        start,
        end,
        isWithdrawals: true,
        isExcludePrivate: false,
        areExtraPaymentsIncluded: true
      })
    const depositsPromise = shouldNotExchangeTradesBeFetched
      ? []
      : this.movements.getMovements({
        auth: user,
        start,
        end,
        isDeposits: true,
        isExcludePrivate: false,
        areExtraPaymentsIncluded: true
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
    const remappedExchangeTrxs = []
    const remappedMarginAndDerivTrxs = []
    const remappedTrxsForConvToUsd = []
    const remappedMarginAndDerivTrxsForConvToUsd = []

    remapTrades(
      trades,
      {
        remappedExchangeTrxs,
        remappedMarginAndDerivTrxs,
        remappedTrxsForConvToUsd,
        remappedMarginAndDerivTrxsForConvToUsd
      }
    )
    remapMovements(
      movements,
      {
        remappedExchangeTrxs,
        remappedTrxsForConvToUsd
      }
    )

    const exchangeTrxs = remappedExchangeTrxs
      .sort((a, b) => b?.mtsCreate - a?.mtsCreate)
    const trxsForConvToUsd = remappedTrxsForConvToUsd
      .sort((a, b) => b?.mtsCreate - a?.mtsCreate)

    return {
      exchangeTrxs,
      marginAndDerivTrxs: remappedMarginAndDerivTrxs,
      trxsForConvToUsd,
      marginAndDerivTrxsForConvToUsd: remappedMarginAndDerivTrxsForConvToUsd
    }
  }

  async #convertCurrencies (trxs, opts) {
    const { interrupter, user } = opts
    const {
      trxMapByCcy,
      totalTrxAmount
    } = getTrxMapByCcy(trxs)
    let count = 0
    let progress = 0

    for (const [symbol, trxPriceCalculators] of trxMapByCcy.entries()) {
      if (interrupter.hasInterrupted()) {
        return
      }

      let pubTrades = []
      let pubTradeStart = pubTrades[pubTrades.length - 1]?.mts
      let pubTradeEnd = pubTrades[0]?.mts

      for (const trxPriceCalculator of trxPriceCalculators) {
        count += 1

        if (interrupter.hasInterrupted()) {
          return
        }

        const { trx } = trxPriceCalculator

        if (
          pubTrades.length === 0 ||
          pubTradeStart > trx.mtsCreate ||
          pubTradeEnd < trx.mtsCreate
        ) {
          const end = trx.mtsCreate

          pubTrades = await this.#getPublicTrades(
            {
              symbol: getCcyPairForConversion(symbol, trxPriceCalculator),
              end
            },
            opts
          )

          if (
            !Array.isArray(pubTrades) ||
            pubTrades.length === 0
          ) {
            const ccySynonymous = await this.currencyConverter
              .getCurrenciesSynonymous()
            const synonymous = ccySynonymous.get(symbol)

            if (
              !synonymous ||
              trxPriceCalculator.kindOfCcyForTriangulation
            ) {
              if (interrupter.hasInterrupted()) {
                return
              }

              throw new PubTradeFindForTrxTaxError({
                symbol,
                pubTradeStart,
                pubTradeEnd,
                requiredMts: trx.mtsCreate
              })
            }

            for (const [symbol, conversion] of synonymous) {
              if (interrupter.hasInterrupted()) {
                return
              }

              const res = await this.#getPublicTrades(
                {
                  symbol: getCcyPairForConversion(symbol, trxPriceCalculator),
                  end
                },
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

          pubTradeStart = pubTrades[pubTrades.length - 1]?.mts
          pubTradeEnd = end ?? pubTrades[0]?.mts
        }

        if (
          !Array.isArray(pubTrades) ||
          pubTrades.length === 0 ||
          !Number.isFinite(pubTradeStart) ||
          !Number.isFinite(pubTradeEnd) ||
          pubTradeStart > trx.mtsCreate ||
          pubTradeEnd < trx.mtsCreate
        ) {
          if (interrupter.hasInterrupted()) {
            return
          }

          throw new PubTradeFindForTrxTaxError({
            symbol,
            pubTradeStart,
            pubTradeEnd,
            requiredMts: trx.mtsCreate
          })
        }

        const pubTrade = findPublicTrade(pubTrades, trx.mtsCreate)
        trxPriceCalculator.calcPrice(pubTrade?.price)
        const _progress = (count / totalTrxAmount) * 100

        if (
          _progress <= 0 ||
          _progress >= 100
        ) {
          continue
        }

        progress = _progress
        await this.#emitProgress(
          user,
          { progress, state: PROGRESS_STATES.OBTAINING_CURRENCY_PRICES }
        )
      }
    }

    await this.#updateExactUsdValueInColls(trxs)
    await this.#emitProgress(
      user,
      { progress, state: PROGRESS_STATES.TRANSACTION_HISTORY_GENERATION }
    )
  }

  async #getTrades ({
    user,
    start,
    end,
    symbol,
    shouldNotExchangeTradesBeFetched,
    shouldNotMarginAndDerivTradesBeFetched
  }) {
    if (
      shouldNotExchangeTradesBeFetched &&
      shouldNotMarginAndDerivTradesBeFetched
    ) {
      return []
    }

    const shouldAllTradesBeFetched = (
      !shouldNotExchangeTradesBeFetched &&
      !shouldNotMarginAndDerivTradesBeFetched
    )

    const symbFilter = (
      Array.isArray(symbol) &&
      symbol.length !== 0
    )
      ? { $in: { symbol } }
      : {}
    const exchangeFilter = (
      shouldAllTradesBeFetched ||
      shouldNotExchangeTradesBeFetched
    )
      ? {}
      : { _isExchange: 1 }
    const marginAndDerivFilter = (
      shouldAllTradesBeFetched ||
      shouldNotMarginAndDerivTradesBeFetched
    )
      ? {}
      : {
          $or: {
            $isNull: '_isExchange',
            $not: { _isExchange: 1 }
          }
        }

    return this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.TRADES,
      {
        subQuery: {
          filter: marginAndDerivFilter
        },
        filter: {
          $eq: {
            user_id: user._id,
            ...exchangeFilter
          },
          $lte: { mtsCreate: end },
          $gte: { mtsCreate: start },
          ...symbFilter
        },
        sort: [['mtsCreate', -1]],
        projection: this.tradesModelFields,
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
      sort = -1,
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

    let promiseResolve = () => {}
    const onceInterruptPromise = new Promise((resolve) => {
      promiseResolve = () => resolve({ res: [] })
      interrupter.onceInterrupt(promiseResolve)
    })
    const getResponse = (res) => {
      interrupter.offInterrupt(promiseResolve)

      return res ?? []
    }

    for (let i = 0; i < 6; i += 1) {
      if (interrupter.hasInterrupted()) {
        return getResponse()
      }

      const pubTradesPromise = this.getDataFromApi({
        getData: (s, args) => getDataFn(args),
        args,
        callerName: 'TRANSACTION_TAX_REPORT',
        eNetErrorAttemptsTimeframeMin: 10,
        eNetErrorAttemptsTimeoutMs: 10000,
        interrupter
      })

      const { res } = await Promise.race([
        pubTradesPromise,
        onceInterruptPromise
      ])

      if (Array.isArray(res)) {
        return getResponse(res)
      }

      await setTimeout(10000)
    }

    return getResponse()
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

  async #emitProgress (user, params) {
    const {
      progress = null,
      state = null
    } = params ?? {}

    await this.wsEventEmitterFactory()
      .emitTrxTaxReportGenerationProgressToOne(
        {
          progress: Number.isFinite(progress)
            ? Math.floor(progress)
            : progress,
          state
        },
        user
      )

    if (state !== PROGRESS_STATES.GENERATION_COMPLETED) {
      return
    }

    this.processMessageManager.sendState(
      this.processMessageManager.PROCESS_MESSAGES.READY_TRX_TAX_REPORT
    )
  }
}

decorateInjectable(TransactionTaxReport, depsTypes)

module.exports = TransactionTaxReport
