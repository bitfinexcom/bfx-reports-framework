'use strict'

const {
  ContainerModule,
  decorate,
  injectable
} = require('inversify')
const EventEmitter = require('events')
const { bindDepsToFn } = require(
  'bfx-report/workers/loc.api/di/helpers'
)

const TYPES = require('./types')

const TABLES_NAMES = require('../sync/dao/tables-names')
const ALLOWED_COLLS = require('../sync/allowed.colls')
const WSTransport = require('../ws-transport')
const WSEventEmitter = require(
  '../ws-transport/ws.event.emitter'
)
const SubAccount = require('../sync/sub.account')
const Progress = require('../sync/progress')
const syncSchema = require('../sync/schema')
const Sync = require('../sync')
const SyncQueue = require('../sync/sync.queue')
const {
  redirectRequestsToApi,
  FOREX_SYMBS
} = require('../sync/helpers')
const {
  searchClosePriceAndSumAmount
} = require('../sync/data.inserter/helpers')
const ApiMiddlewareHandlerAfter = require(
  '../sync/data.inserter/api.middleware.handler.after'
)
const ApiMiddleware = require(
  '../sync/data.inserter/api.middleware'
)
const DataInserter = require('../sync/data.inserter')
const ConvertCurrencyHook = require(
  '../sync/data.inserter/hooks/convert.currency.hook'
)
const RecalcSubAccountLedgersBalancesHook = require(
  '../sync/data.inserter/hooks/recalc.sub.account.ledgers.balances.hook'
)
const SqliteDAO = require('../sync/dao/dao.sqlite')
const {
  PublicСollsСonfAccessors
} = require('../sync/colls.accessors')
const Wallets = require('../sync/wallets')
const BalanceHistory = require('../sync/balance.history')
const WinLoss = require('../sync/win.loss')
const PositionsSnapshot = require('../sync/positions.snapshot')
const FullSnapshotReport = require('../sync/full.snapshot.report')
const Trades = require('../sync/trades')
const TradedVolume = require('../sync/traded.volume')
const FeesReport = require('../sync/fees.report')
const PerformingLoan = require('../sync/performing.loan')
const SubAccountApiData = require('../sync/sub.account.api.data')
const PositionsAudit = require('../sync/positions.audit')
const OrderTrades = require('../sync/order.trades')
const CurrencyConverter = require('../sync/currency.converter')
const CsvJobData = require('../generate-csv/csv.job.data')
const {
  fullSnapshotReportCsvWriter,
  fullTaxReportCsvWriter
} = require('../generate-csv/csv-writer')
const FullTaxReport = require('../sync/full.tax.report')
const SqliteDbMigrator = require(
  '../sync/dao/db-migrations/sqlite.db.migrator'
)
const {
  migrationsFactory,
  dbMigratorFactory,
  dataInserterFactory
} = require('./factories')

decorate(injectable(), EventEmitter)

module.exports = ({
  grcBfxOpts
}) => {
  return new ContainerModule((bind, unbind, isBound, rebind) => {
    bind(TYPES.FrameworkRServiceDepsSchema)
      .toDynamicValue((ctx) => {
        return [
          ['_conf', TYPES.CONF],
          ['_sync', TYPES.Sync],
          ['_wsEventEmitter', TYPES.WSEventEmitter],
          ['_TABLES_NAMES', TYPES.TABLES_NAMES],
          ['_ALLOWED_COLLS', TYPES.ALLOWED_COLLS],
          ['_prepareResponse', TYPES.PrepareResponse],
          ['_subAccount', TYPES.SubAccount],
          ['_progress', TYPES.Progress],
          ['_syncSchema', TYPES.SyncSchema],
          ['_dao', TYPES.DAO],
          ['_publicСollsСonfAccessors', TYPES.PublicСollsСonfAccessors],
          ['_wallets', TYPES.Wallets],
          ['_balanceHistory', TYPES.BalanceHistory],
          ['_winLoss', TYPES.WinLoss],
          ['_positionsSnapshot', TYPES.PositionsSnapshot],
          ['_fullSnapshotReport', TYPES.FullSnapshotReport],
          ['_fullTaxReport', TYPES.FullTaxReport],
          ['_tradedVolume', TYPES.TradedVolume],
          ['_feesReport', TYPES.FeesReport],
          ['_performingLoan', TYPES.PerformingLoan],
          ['_subAccountApiData', TYPES.SubAccountApiData],
          ['_positionsAudit', TYPES.PositionsAudit],
          ['_orderTrades', TYPES.OrderTrades]
        ]
      })
    rebind(TYPES.RServiceDepsSchemaAliase)
      .toDynamicValue((ctx) => [
        ...ctx.container.get(TYPES.RServiceDepsSchema),
        ...ctx.container.get(TYPES.FrameworkRServiceDepsSchema)
      ])
    bind(TYPES.TABLES_NAMES).toConstantValue(TABLES_NAMES)
    bind(TYPES.ALLOWED_COLLS).toConstantValue(ALLOWED_COLLS)
    bind(TYPES.GRC_BFX_OPTS).toConstantValue(grcBfxOpts)
    bind(TYPES.FOREX_SYMBS).toConstantValue(FOREX_SYMBS)
    bind(TYPES.WSTransport)
      .to(WSTransport)
      .inSingletonScope()
    bind(TYPES.WSEventEmitter)
      .to(WSEventEmitter)
      .inSingletonScope()
    bind(TYPES.PublicСollsСonfAccessors)
      .to(PublicСollsСonfAccessors)
      .inSingletonScope()
    bind(TYPES.Progress)
      .to(Progress)
      .inSingletonScope()
    bind(TYPES.SubAccount)
      .to(SubAccount)
    bind(TYPES.SyncSchema).toConstantValue(
      syncSchema
    )
    bind(TYPES.MigrationsFactory)
      .toFactory(migrationsFactory)
    bind(TYPES.SqliteDbMigrator)
      .to(SqliteDbMigrator)
      .inSingletonScope()
    bind(TYPES.DbMigratorFactory)
      .toFactory(dbMigratorFactory)
    bind(TYPES.DB)
      .toDynamicValue((ctx) => {
        const { dbDriver } = ctx.container.get(
          TYPES.CONF
        )
        const rService = ctx.container.get(
          TYPES.RService
        )

        if (dbDriver === 'sqlite') {
          return rService.ctx.dbSqlite_m0.db
        }
      })
    bind(TYPES.SqliteDAO)
      .to(SqliteDAO)
    bind(TYPES.DAO)
      .toDynamicValue((ctx) => {
        const { dbDriver } = ctx.container.get(
          TYPES.CONF
        )

        if (dbDriver === 'sqlite') {
          return ctx.container.get(
            TYPES.SqliteDAO
          )
        }
      })
      .inSingletonScope()
    bind(TYPES.SearchClosePriceAndSumAmount)
      .toConstantValue(
        bindDepsToFn(
          searchClosePriceAndSumAmount,
          [
            TYPES.RService,
            TYPES.DAO,
            TYPES.ALLOWED_COLLS
          ]
        )
      )
    bind(TYPES.RedirectRequestsToApi).toConstantValue(
      bindDepsToFn(
        redirectRequestsToApi,
        [
          TYPES.DAO,
          TYPES.TABLES_NAMES,
          TYPES.WSEventEmitter
        ]
      )
    )
    bind(TYPES.CurrencyConverter)
      .to(CurrencyConverter)
    bind(TYPES.ApiMiddlewareHandlerAfter)
      .to(ApiMiddlewareHandlerAfter)
    bind(TYPES.ApiMiddleware)
      .to(ApiMiddleware)
    bind(TYPES.DataInserter)
      .to(DataInserter)
    bind(TYPES.DataInserterFactory)
      .toFactory(dataInserterFactory)
    bind(TYPES.ConvertCurrencyHook)
      .to(ConvertCurrencyHook)
    bind(TYPES.RecalcSubAccountLedgersBalancesHook)
      .to(RecalcSubAccountLedgersBalancesHook)
    bind(TYPES.SyncQueue)
      .to(SyncQueue)
      .inSingletonScope()
    bind(TYPES.Sync)
      .to(Sync)
      .inSingletonScope()
    bind(TYPES.Wallets)
      .to(Wallets)
    bind(TYPES.BalanceHistory)
      .to(BalanceHistory)
    bind(TYPES.WinLoss)
      .to(WinLoss)
    bind(TYPES.PositionsSnapshot)
      .to(PositionsSnapshot)
    bind(TYPES.FullSnapshotReport)
      .to(FullSnapshotReport)
    bind(TYPES.Trades)
      .to(Trades)
    bind(TYPES.TradedVolume)
      .to(TradedVolume)
    bind(TYPES.FeesReport)
      .to(FeesReport)
    bind(TYPES.PerformingLoan)
      .to(PerformingLoan)
    bind(TYPES.SubAccountApiData)
      .to(SubAccountApiData)
    bind(TYPES.PositionsAudit)
      .to(PositionsAudit)
    bind(TYPES.OrderTrades)
      .to(OrderTrades)
    bind(TYPES.FullSnapshotReportCsvWriter)
      .toConstantValue(
        bindDepsToFn(
          fullSnapshotReportCsvWriter,
          [TYPES.RService]
        )
      )
    bind(TYPES.FullTaxReportCsvWriter)
      .toConstantValue(
        bindDepsToFn(
          fullTaxReportCsvWriter,
          [TYPES.RService]
        )
      )
    bind(TYPES.FullTaxReport)
      .to(FullTaxReport)
    rebind(TYPES.CsvJobData)
      .to(CsvJobData)
      .inSingletonScope()
  })
}
