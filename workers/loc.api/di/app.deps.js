'use strict'

const { ContainerModule } = require('inversify')
const bindDepsToFn = require(
  'bfx-report/workers/loc.api/di/bind-deps-to-fn'
)

const TYPES = require('./types')

const ALLOWED_COLLS = require('../sync/allowed.colls')
const WSTransport = require('../ws-transport')
const WSEventEmitter = require(
  '../ws-transport/ws.event.emitter'
)
const Progress = require('../sync/progress')
const syncSchema = require('../sync/schema')
const sync = require('../sync')
const SyncQueue = require('../sync/sync.queue')
const {
  redirectRequestsToApi
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
const SqliteDAO = require('../sync/dao/dao.sqlite')
const {
  PublicСollsСonfAccessors
} = require('../sync/colls.accessors')

module.exports = ({
  grcBfxOpts
}) => {
  return new ContainerModule((bind, unbind, isBound, rebind) => {
    rebind(TYPES.RServiceDepsSchema)
      .toDynamicValue((ctx) => {
        return [
          ...ctx.container.get(TYPES.RServiceDepsSchema),
          ['_conf', TYPES.CONF],
          ['_sync', TYPES.Sync],
          ['_wsEventEmitter', TYPES.WSEventEmitter],
          ['_ALLOWED_COLLS', TYPES.ALLOWED_COLLS],
          ['_prepareResponse', TYPES.PrepareResponse],
          ['_progress', TYPES.Progress],
          ['_syncSchema', TYPES.SyncSchema],
          ['_dao', TYPES.DAO],
          ['_publicСollsСonfAccessors', TYPES.PublicСollsСonfAccessors]
        ]
      })
      .inSingletonScope()
    bind(TYPES.ALLOWED_COLLS).toConstantValue(ALLOWED_COLLS)
    bind(TYPES.GRC_BFX_OPTS).toConstantValue(grcBfxOpts)
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
    bind(TYPES.SyncSchema).toConstantValue(
      syncSchema
    )
    bind(TYPES.SqliteDAO)
      .to(SqliteDAO)
    bind(TYPES.DAO)
      .toDynamicValue((ctx) => {
        const { dbDriver } = ctx.container.get(
          TYPES.CONF
        )
        const rService = ctx.container.get(
          TYPES.RService
        )

        if (dbDriver === 'sqlite') {
          const db = rService.ctx.dbSqlite_m0.db
          const dao = ctx.container.get(
            TYPES.SqliteDAO
          )
          dao.setDB(db)

          return dao
        }
      })
      .inSingletonScope()
    bind(TYPES.SearchClosePriceAndSumAmount)
      .toConstantValue(
        bindDepsToFn(
          searchClosePriceAndSumAmount,
          [
            TYPES.RService,
            TYPES.DAO
          ],
          true
        )
      )
      .inSingletonScope()
    bind(TYPES.ApiMiddlewareHandlerAfter)
      .to(ApiMiddlewareHandlerAfter)
    bind(TYPES.ApiMiddleware)
      .to(ApiMiddleware)
    bind(TYPES.DataInserter)
      .to(DataInserter)
    bind(TYPES.DataInserterFactory)
      .toFactory((ctx) => {
        return (syncColls) => {
          const dataInserter = ctx.container.get(
            TYPES.DataInserter
          )
          dataInserter.init(syncColls)

          return dataInserter
        }
      })
    bind(TYPES.SyncQueue)
      .to(SyncQueue)
      .inSingletonScope()
    bind(TYPES.RedirectRequestsToApi).toConstantValue(
      bindDepsToFn(
        redirectRequestsToApi,
        [
          TYPES.DAO,
          TYPES.WSEventEmitter
        ],
        true
      )
    )
    bind(TYPES.Sync).toConstantValue(
      bindDepsToFn(
        sync,
        [
          TYPES.SyncQueue,
          TYPES.RService,
          TYPES.ALLOWED_COLLS,
          TYPES.Progress
        ],
        true
      )
    )
  })
}
