'use strict'

const {
  splitSymbolPairs
} = require('bfx-report/workers/loc.api/helpers')

const {
  isForexSymb
} = require('../helpers')
const {
  TrxTaxReportGenerationTimeoutError
} = require('../../errors')
const {
  lookUpTrades,
  getTrxMapByCcy
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
  TYPES.Logger
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
    logger
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
    const {
      start = 0,
      end = Date.now()
    } = params ?? {}
    const user = await this.authenticator
      .verifyRequestUser({ auth })

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

    const isBackIterativeLookUp = true
    const { buyTradesWithUnrealizedProfit } = await lookUpTrades(
      trxsForPrevPeriod,
      {
        isBackIterativeLookUp,
        buyTradesWithUnrealizedProfit: true,
        isNotGainOrLossRequired: true
      }
    )

    trxsForCurrPeriod.push(...buyTradesWithUnrealizedProfit)
    trxsForConvToUsd.push(...buyTradesWithUnrealizedProfit
      .filter((trx) => trx?.lastSymb !== 'USD'))
    await this.#convertCurrencies(trxsForConvToUsd)

    const { saleTradesWithRealizedProfit } = await lookUpTrades(
      trxsForCurrPeriod, { isBackIterativeLookUp }
    )

    return saleTradesWithRealizedProfit
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
        isExcludePrivate: true
      }
    )
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
      isWithdrawals: true
    })
    const depositsPromise = this.movements.getMovements({
      auth: user,
      start,
      end,
      isDeposits: true
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
    const remapedTrxs = []
    const remapedTrxsForConvToUsd = []

    for (const trade of trades) {
      if (
        !trade?.symbol ||
        !Number.isFinite(trade?.execAmount) ||
        trade.execAmount === 0 ||
        !Number.isFinite(trade?.execPrice) ||
        trade.execPrice === 0 ||
        !Number.isFinite(trade?.mtsCreate)
      ) {
        continue
      }

      const [firstSymb, lastSymb] = splitSymbolPairs(trade.symbol)
      trade.firstSymb = firstSymb
      trade.lastSymb = lastSymb
      trade.firstSymbPrise = null
      trade.lastSymbPrise = null

      remapedTrxs.push(trade)

      if (lastSymb === 'USD') {
        trade.firstSymbPrise = trade.execPrice
        trade.lastSymbPrise = 1

        continue
      }

      remapedTrxsForConvToUsd.push(trade)
    }

    if (remapedTrxs.length === 0) {
      return {
        trx: [],
        trxsForConvToUsd: []
      }
    }

    for (const movement of movements) {
      if (
        !movement?.currency ||
        isForexSymb(movement.currency) ||
        !Number.isFinite(movement?.amount) ||
        movement.amount === 0 ||
        !Number.isFinite(movement?.mtsUpdated)
      ) {
        continue
      }

      const firstSymb = movement.currency
      const lastSymb = 'USD'
      const symbSeparator = firstSymb.length > 3
        ? ':'
        : ''

      const remapedMovement = {
        isMovements: true,
        symbol: `t${firstSymb}${symbSeparator}${lastSymb}`,
        mtsCreate: movement.mtsUpdated,
        firstSymb,
        lastSymb,
        firstSymbPrise: null,
        lastSymbPrise: 1,
        execAmount: movement.amount,
        // NOTE: execPrice = firstSymbPrise and should be set when converting currencies
        execPrice: 0
      }

      remapedTrxs.push(remapedMovement)
      remapedTrxsForConvToUsd.push(remapedMovement)
    }

    const trxs = remapedTrxs
      .sort((a, b) => b?.mtsCreate - a?.mtsCreate)
    const trxsForConvToUsd = remapedTrxsForConvToUsd
      .sort((a, b) => b?.mtsCreate - a?.mtsCreate)

    return {
      trxs,
      trxsForConvToUsd
    }
  }

  async #convertCurrencies (trxs) {
    const trxMapByCcy = getTrxMapByCcy(trxs)

    for (const [symbol, trxData] of trxMapByCcy.entries()) {
      const pubTrades = []
      const pubTradeChunkPayloads = this.#getPubTradeChunkPayloads(
        symbol,
        trxData
      )

      for (const chunkPayload of pubTradeChunkPayloads) {
        const chunk = await this.#getPublicTradeChunk(chunkPayload)

        pubTrades.push(...chunk)
      }

      for (const trxDataItem of trxData) {
        let lastIndex = 0

        for (let i = lastIndex + 1; pubTrades.length > i; i += 1) {
          const pubTrade = pubTrades[i]
          const isLastPubTrade = (i + 1) === pubTrades.length

          if (
            (
              pubTrade?.mts > trxDataItem.trx.mtsCreate &&
              !isLastPubTrade
            ) ||
            !Number.isFinite(pubTrade?.price) ||
            pubTrade.price === 0
          ) {
            continue
          }

          lastIndex = i
          trxDataItem.trx[trxDataItem.mainPrisePropName] = pubTrade.price

          if (trxDataItem.trx.isMovements) {
            trxDataItem.trx.execPrice = pubTrade.price

            break
          }
          if (
            !Number.isFinite(trxDataItem.trx.execPrice) ||
            trxDataItem.trx.execPrice === 0
          ) {
            break
          }
          if (
            trxDataItem.isNotFirstSymbForex &&
            !trxDataItem.isNotFirstSymbForex
          ) {
            trxDataItem.trx[trxDataItem.secondPrisePropName] = (
              pubTrade.price / trxDataItem.trx.execPrice
            )
          }
          if (
            !trxDataItem.isNotFirstSymbForex &&
            trxDataItem.isNotFirstSymbForex
          ) {
            trxDataItem.trx[trxDataItem.secondPrisePropName] = (
              pubTrade.price * trxDataItem.trx.execPrice
            )
          }

          break
        }
      }
    }
  }

  // TODO:
  #getPubTradeChunkPayloads (symbol, trxData) {
    const pubTradeChunkPayloads = []

    for (const { trx } of trxData) {
      const lastPayloads = pubTradeChunkPayloads[pubTradeChunkPayloads.length - 1]
      const lastMts = lastPayloads?.start ?? lastPayloads?.end
      const currMts = trx.mtsCreate

      if (!lastPayloads?.end) {
        pubTradeChunkPayloads.push({
          symbol,
          end: currMts,
          start: null
        })

        continue
      }

      const mtsDiff = lastMts - currMts
      const maxAllowedTimeframe = 1000 * 60 * 60 * 24

      if (mtsDiff < maxAllowedTimeframe) {
        lastPayloads.start = currMts

        continue
      }

      pubTradeChunkPayloads.push({
        symbol,
        end: currMts,
        start: null
      })
    }

    return pubTradeChunkPayloads
  }

  async #getPublicTradeChunk (params) {
    const symbol = params?.symbol
    const start = params?.start
    let end = params?.end
    let timeoutMts = Date.now()
    const res = []

    while (true) {
      const currMts = Date.now()
      const mtsDiff = currMts - timeoutMts

      if (mtsDiff > 1000 * 60 * 60 * 12) {
        throw new TrxTaxReportGenerationTimeoutError()
      }

      timeoutMts = currMts

      const { res: pubTrades } = await this.#getPublicTrades({
        symbol: `t${symbol}USD`,
        start: 0,
        end
      })

      if (
        !Array.isArray(pubTrades) ||
        pubTrades.length === 0 ||
        !Number.isFinite(start) ||
        !Number.isFinite(pubTrades[0]?.mts) ||
        !Number.isFinite(pubTrades[pubTrades.length - 1]?.mts) ||
        (
          res.length !== 0 &&
          pubTrades[0]?.mts >= res[res.length - 1]?.mts
        ) ||
        pubTrades[pubTrades.length - 1]?.mts <= start
      ) {
        res.push(...pubTrades)

        break
      }

      end = pubTrades[pubTrades.length - 1].mts - 1
      res.push(...pubTrades)
    }

    return res
  }

  async #getPublicTrades (params) {
    const {
      symbol,
      start = 0,
      end = Date.now(),
      sort = -1,
      limit = 10000
    } = params ?? {}
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

    const res = await this.getDataFromApi({
      getData: (s, args) => getDataFn(args),
      args,
      callerName: 'TRANSACTION_TAX_REPORT',
      eNetErrorAttemptsTimeframeMin: 10,
      eNetErrorAttemptsTimeoutMs: 10000,
      shouldNotInterrupt: true
    })

    return res
  }
}

decorateInjectable(TransactionTaxReport, depsTypes)

module.exports = TransactionTaxReport
