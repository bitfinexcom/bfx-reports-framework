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
const {
  getREST,
  getDataFromApi,
  prepareApiResponse
} = require('bfx-report/workers/loc.api/helpers')
const responder = require('bfx-report/workers/loc.api/responder')

const TYPES = require('./types')

const TABLES_NAMES = require('../sync/schema/tables-names')
const ALLOWED_COLLS = require('../sync/schema/allowed.colls')
const SYNC_API_METHODS = require('../sync/schema/sync.api.methods')
const SYNC_QUEUE_STATES = require('../sync/sync.queue/sync.queue.states')
const CHECKER_NAMES = require(
  '../sync/data.consistency.checker/checker.names'
)
const WSTransport = require('../ws-transport')
const WSEventEmitter = require(
  '../ws-transport/ws.event.emitter'
)
const SubAccount = require('../sync/sub.account')
const Progress = require('../sync/progress')
const syncSchema = require('../sync/schema')
const Sync = require('../sync')
const SyncInterrupter = require('../sync/sync.interrupter')
const SyncQueue = require('../sync/sync.queue')
const SyncCollsManager = require('../sync/sync.colls.manager')
const SyncTempTablesManager = require(
  '../sync/data.inserter/sync.temp.tables.manager'
)
const SyncUserStepManager = require(
  '../sync/data.inserter/sync.user.step.manager'
)
const SyncUserStepData = require(
  '../sync/data.inserter/sync.user.step.manager/sync.user.step.data'
)
const Checkers = require(
  '../sync/data.consistency.checker/checkers'
)
const DataConsistencyChecker = require(
  '../sync/data.consistency.checker'
)
const {
  redirectRequestsToApi
} = require('../sync/helpers')
const {
  searchClosePriceAndSumAmount
} = require('../sync/data.inserter/helpers')
const ApiMiddlewareHandlerAfter = require(
  '../sync/data.inserter/api.middleware/api.middleware.handler.after'
)
const ApiMiddleware = require(
  '../sync/data.inserter/api.middleware'
)
const DataChecker = require('../sync/data.inserter/data.checker')
const DataInserter = require('../sync/data.inserter')
const ConvertCurrencyHook = require(
  '../sync/data.inserter/hooks/convert.currency.hook'
)
const RecalcSubAccountLedgersBalancesHook = require(
  '../sync/data.inserter/hooks/recalc.sub.account.ledgers.balances.hook'
)
const BetterSqliteDAO = require('../sync/dao/dao.better.sqlite')
const {
  PublicСollsСonfAccessors
} = require('../sync/colls.accessors')
const Movements = require('../sync/movements')
const WinLossVSAccountBalance = require('../sync/win.loss.vs.account.balance')
const Wallets = require('../sync/wallets')
const BalanceHistory = require('../sync/balance.history')
const WinLoss = require('../sync/win.loss')
const SummaryByAsset = require('../sync/summary.by.asset')
const PositionsSnapshot = require('../sync/positions.snapshot')
const FullSnapshotReport = require('../sync/full.snapshot.report')
const Trades = require('../sync/trades')
const TradedVolume = require('../sync/traded.volume')
const TotalFeesReport = require('../sync/total.fees.report')
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
const WeightedAveragesReport = require('../sync/weighted.averages.report')
const SqliteDbMigrator = require(
  '../sync/dao/db-migrations/sqlite.db.migrator'
)
const DBBackupManager = require(
  '../sync/dao/db.backup.manager'
)
const {
  migrationsFactory,
  dbMigratorFactory,
  dataInserterFactory,
  syncFactory,
  processMessageManagerFactory,
  syncUserStepDataFactory,
  wsEventEmitterFactory
} = require('./factories')
const Crypto = require('../sync/crypto')
const Authenticator = require('../sync/authenticator')
const privResponder = require('../responder')
const ProcessMessageManager = require('../process.message.manager')
const HTTPRequest = require('../http.request')
const BfxApiRouter = require('../bfx.api.router')

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
          ['_redirectRequestsToApi', TYPES.RedirectRequestsToApi],
          ['_TABLES_NAMES', TYPES.TABLES_NAMES],
          ['_ALLOWED_COLLS', TYPES.ALLOWED_COLLS],
          ['_SYNC_API_METHODS', TYPES.SYNC_API_METHODS],
          ['_SYNC_QUEUE_STATES', TYPES.SYNC_QUEUE_STATES],
          ['_CHECKER_NAMES', TYPES.CHECKER_NAMES],
          ['_prepareResponse', TYPES.PrepareResponse],
          ['_subAccount', TYPES.SubAccount],
          ['_progress', TYPES.Progress],
          ['_syncSchema', TYPES.SyncSchema],
          ['_dao', TYPES.DAO],
          ['_publicСollsСonfAccessors', TYPES.PublicСollsСonfAccessors],
          ['_wallets', TYPES.Wallets],
          ['_balanceHistory', TYPES.BalanceHistory],
          ['_winLoss', TYPES.WinLoss],
          ['_summaryByAsset', TYPES.SummaryByAsset],
          ['_positionsSnapshot', TYPES.PositionsSnapshot],
          ['_fullSnapshotReport', TYPES.FullSnapshotReport],
          ['_fullTaxReport', TYPES.FullTaxReport],
          ['_tradedVolume', TYPES.TradedVolume],
          ['_totalFeesReport', TYPES.TotalFeesReport],
          ['_performingLoan', TYPES.PerformingLoan],
          ['_subAccountApiData', TYPES.SubAccountApiData],
          ['_positionsAudit', TYPES.PositionsAudit],
          ['_orderTrades', TYPES.OrderTrades],
          ['_authenticator', TYPES.Authenticator],
          ['_privResponder', TYPES.PrivResponder],
          ['_syncCollsManager', TYPES.SyncCollsManager],
          ['_dataConsistencyChecker', TYPES.DataConsistencyChecker],
          ['_winLossVSAccountBalance', TYPES.WinLossVSAccountBalance],
          ['_getDataFromApi', TYPES.GetDataFromApi],
          ['_httpRequest', TYPES.HTTPRequest],
          ['_wsEventEmitterFactory', TYPES.WSEventEmitterFactory]
        ]
      })
    rebind(TYPES.RServiceDepsSchemaAliase)
      .toDynamicValue((ctx) => [
        ...ctx.container.get(TYPES.RServiceDepsSchema),
        ...ctx.container.get(TYPES.FrameworkRServiceDepsSchema)
      ])
    bind(TYPES.WSEventEmitterFactory)
      .toFactory(wsEventEmitterFactory)
    rebind(TYPES.Responder).toConstantValue(
      bindDepsToFn(
        responder,
        [
          TYPES.Container,
          TYPES.Logger,
          TYPES.WSEventEmitterFactory
        ]
      )
    )
    bind(TYPES.PrivResponder)
      .toDynamicValue((ctx) => bindDepsToFn(
        privResponder,
        [
          TYPES.Container,
          TYPES.Logger,
          TYPES.WSEventEmitterFactory,
          TYPES.Authenticator
        ]
      ))
      .inSingletonScope()
    bind(TYPES.TABLES_NAMES).toConstantValue(TABLES_NAMES)
    bind(TYPES.ALLOWED_COLLS).toConstantValue(ALLOWED_COLLS)
    bind(TYPES.SYNC_API_METHODS).toConstantValue(SYNC_API_METHODS)
    bind(TYPES.SYNC_QUEUE_STATES).toConstantValue(SYNC_QUEUE_STATES)
    bind(TYPES.CHECKER_NAMES).toConstantValue(CHECKER_NAMES)
    bind(TYPES.GRC_BFX_OPTS).toConstantValue(grcBfxOpts)
    bind(TYPES.ProcessMessageManager)
      .to(ProcessMessageManager)
      .inSingletonScope()
    bind(TYPES.HTTPRequest)
      .to(HTTPRequest)
      .inSingletonScope()
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
    bind(TYPES.Crypto)
      .to(Crypto)
      .inSingletonScope()
    bind(TYPES.SyncFactory)
      .toFactory(syncFactory)
    bind(TYPES.ProcessMessageManagerFactory)
      .toFactory(processMessageManagerFactory)
    bind(TYPES.Authenticator)
      .to(Authenticator)
      .inSingletonScope()
    bind(TYPES.SyncSchema).toConstantValue(
      syncSchema
    )
    bind(TYPES.MigrationsFactory)
      .toFactory(migrationsFactory)
    bind(TYPES.SqliteDbMigrator)
      .to(SqliteDbMigrator)
      .inSingletonScope()
    bind(TYPES.DBBackupManager)
      .to(DBBackupManager)
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

        if (dbDriver === 'better-sqlite') {
          return rService.ctx.dbBetterSqlite_m0
        }
      })
    bind(TYPES.BetterSqliteDAO)
      .to(BetterSqliteDAO)
    bind(TYPES.DAO)
      .toDynamicValue((ctx) => {
        const { dbDriver } = ctx.container.get(
          TYPES.CONF
        )

        if (dbDriver === 'better-sqlite') {
          return ctx.container.get(
            TYPES.BetterSqliteDAO
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
            TYPES.GetDataFromApi,
            TYPES.DAO,
            TYPES.ALLOWED_COLLS
          ]
        )
      )
    bind(TYPES.SyncCollsManager)
      .to(SyncCollsManager)
      .inSingletonScope()
    bind(TYPES.RedirectRequestsToApi).toConstantValue(
      bindDepsToFn(
        redirectRequestsToApi,
        [
          TYPES.DAO,
          TYPES.TABLES_NAMES,
          TYPES.WSEventEmitter,
          TYPES.Authenticator,
          TYPES.SyncCollsManager
        ]
      )
    )
    bind(TYPES.CurrencyConverter)
      .to(CurrencyConverter)
    bind(TYPES.ApiMiddlewareHandlerAfter)
      .to(ApiMiddlewareHandlerAfter)
    bind(TYPES.ApiMiddleware)
      .to(ApiMiddleware)
    bind(TYPES.DataChecker)
      .to(DataChecker)
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
    bind(TYPES.SyncTempTablesManager)
      .to(SyncTempTablesManager)
    bind(TYPES.SyncUserStepManager)
      .to(SyncUserStepManager)
    bind(TYPES.SyncUserStepData)
      .to(SyncUserStepData)
    bind(TYPES.SyncUserStepDataFactory)
      .toFactory(syncUserStepDataFactory)
    bind(TYPES.Checkers)
      .to(Checkers)
      .inSingletonScope()
    bind(TYPES.DataConsistencyChecker)
      .to(DataConsistencyChecker)
      .inSingletonScope()
    bind(TYPES.Sync)
      .to(Sync)
      .inSingletonScope()
    bind(TYPES.SyncInterrupter)
      .to(SyncInterrupter)
      .inSingletonScope()
    bind(TYPES.Movements)
      .to(Movements)
    bind(TYPES.WinLossVSAccountBalance)
      .to(WinLossVSAccountBalance)
    bind(TYPES.Wallets)
      .to(Wallets)
    bind(TYPES.BalanceHistory)
      .to(BalanceHistory)
    bind(TYPES.WinLoss)
      .to(WinLoss)
    bind(TYPES.SummaryByAsset)
      .to(SummaryByAsset)
    bind(TYPES.PositionsSnapshot)
      .to(PositionsSnapshot)
    bind(TYPES.FullSnapshotReport)
      .to(FullSnapshotReport)
    bind(TYPES.Trades)
      .to(Trades)
    bind(TYPES.TradedVolume)
      .to(TradedVolume)
    bind(TYPES.TotalFeesReport)
      .to(TotalFeesReport)
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
          [
            TYPES.RService,
            TYPES.GetDataFromApi
          ]
        )
      )
    bind(TYPES.FullTaxReportCsvWriter)
      .toConstantValue(
        bindDepsToFn(
          fullTaxReportCsvWriter,
          [
            TYPES.RService,
            TYPES.GetDataFromApi
          ]
        )
      )
    bind(TYPES.FullTaxReport)
      .to(FullTaxReport)
    rebind(TYPES.WeightedAveragesReport)
      .to(WeightedAveragesReport)
    rebind(TYPES.CsvJobData)
      .to(CsvJobData)
      .inSingletonScope()
    rebind(TYPES.GetDataFromApi).toConstantValue(
      bindDepsToFn(
        getDataFromApi,
        [
          TYPES.SyncInterrupter,
          TYPES.WSEventEmitter
        ]
      )
    )
    rebind(TYPES.BfxApiRouter)
      .to(BfxApiRouter)
      .inSingletonScope()
    rebind(TYPES.GetREST).toConstantValue(
      bindDepsToFn(
        getREST,
        [
          TYPES.CONF,
          TYPES.BfxApiRouter
        ]
      )
    )
    rebind(TYPES.PrepareApiResponse).toConstantValue(
      bindDepsToFn(
        prepareApiResponse,
        [TYPES.GetREST]
      )
    )
  })
}
