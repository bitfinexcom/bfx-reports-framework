'use strict'

const { ContainerModule } = require('inversify')

const bindDepsToFn = require(
  'bfx-report/workers/loc.api/di/bind-deps-to-fn'
)
const bindDepsToInstance = require(
  'bfx-report/workers/loc.api/di/bind-deps-to-instance'
)

const TYPES = require('./types')

const ALLOWED_COLLS = require('../sync/allowed.colls')
const WSTransport = require('../ws-transport')
const WSEventEmitter = require('../ws-transport/ws.event.emitter')
// const DataInserter = require('./loc.api/sync/data.inserter')

module.exports = ({
  grcBfxOpts
}) => {
  return new ContainerModule((bind, unbind, isBound, rebind) => {
    rebind(TYPES.RServiceDepsSchema)
      .toDynamicValue((ctx) => {
        return [
          ...ctx.container.get(TYPES.RServiceDepsSchema)
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
  })
}
