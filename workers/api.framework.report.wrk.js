'use strict'

if (typeof process.send !== 'function') {
  process.send = () => {}
}

const WrkReportServiceApi = require(
  'bfx-report/workers/api.service.report.wrk'
)
const path = require('path')
const argv = require('yargs')
  .option('syncMode', {
    type: 'boolean'
  })
  .option('isSchedulerEnabled', {
    type: 'boolean'
  })
  .option('dbDriver', {
    choices: ['better-sqlite'],
    type: 'string'
  })
  .option('verboseSql', {
    type: 'boolean'
  })
  .option('wsPort', {
    type: 'number'
  })
  .option('grape', {
    type: 'string'
  })
  .option('secretKey', {
    type: 'string'
  })
  .option('schedulerRule', {
    type: 'string'
  })
  .help('help')
  .argv

const appDeps = require('./loc.api/di/app.deps')
const TYPES = require('./loc.api/di/types')

class WrkReportFrameWorkApi extends WrkReportServiceApi {
  loadAppDeps (...args) {
    super.loadAppDeps(...args)

    const _appDeps = appDeps(...args)

    this.appDeps.push(_appDeps)
    this.container.load(_appDeps)
  }

  getGrcConf () {
    return {
      ...super.getGrcConf(),
      grape: argv.grape
    }
  }

  getApiConf () {
    const conf = this.conf[this.group]
    const suffix = conf.syncMode ? '.framework' : ''

    return { path: `service.report${suffix}` }
  }

  getPluginCtx (type) {
    const ctx = super.getPluginCtx(type)
    const conf = this.conf[this.group]

    if (
      type === 'api_bfx' &&
      conf.syncMode
    ) {
      const dbFacNs = this.getFacNs(`db-${conf.dbDriver}`, 'm0')

      ctx.scheduler_sync = this.scheduler_sync
      ctx[dbFacNs] = this[dbFacNs]
    }

    return ctx
  }

  setArgsOfCommandLineToConf (
    args = argv,
    names = [
      'syncMode',
      'isSchedulerEnabled',
      'dbDriver',
      'verboseSql',
      'wsPort',
      'secretKey',
      'schedulerRule'
    ]
  ) {
    super.setArgsOfCommandLineToConf()
    super.setArgsOfCommandLineToConf(args, names)
  }

  init () {
    super.init()

    const dbPathAbsolute = path.isAbsolute(argv.dbFolder)
      ? argv.dbFolder
      : path.join(this.ctx.root, argv.dbFolder)
    const workerPathAbsolute = path.join(
      this.ctx.root,
      'workers/loc.api/sync/dao/sqlite-worker/index.js'
    )
    const {
      syncMode,
      dbDriver,
      verboseSql
    } = this.conf[this.group]
    const facs = []

    if (syncMode) {
      facs.push(
        [
          'fac',
          'bfx-facs-scheduler',
          'sync',
          'sync',
          { label: 'sync' }
        ],
        [
          'fac',
          `bfx-facs-db-${dbDriver}`,
          'm0',
          'm0',
          {
            name: 'sync',
            dbPathAbsolute,
            workerPathAbsolute,
            verbose: verboseSql,
            timeout: 20000,
            busyTimeout: 20000
          }
        ]
      )
    }

    this.setInitFacs(facs)
  }

  async initService (deps) {
    await super.initService({
      grcBfxOpts: this.grc_bfx.opts,
      ...deps
    })

    const conf = this.conf[this.group]
    const wsTransport = this.container.get(TYPES.WSTransport)
    const sync = this.container.get(TYPES.Sync)

    await wsTransport.start()

    if (
      !conf.syncMode ||
      !conf.isSchedulerEnabled
    ) {
      return
    }

    const { rule } = (
      conf.schedulerRule &&
      typeof conf.schedulerRule === 'string'
    )
      ? { rule: conf.schedulerRule }
      : require(path.join(
        this.ctx.root,
        'config',
        'schedule.json'
      ))
    const name = 'sync'

    this.scheduler_sync.add(name, () => sync.start(), rule)
    this.scheduler_sync.mem.get(name).rule = rule

    process.send({ state: 'ready:worker' })
  }

  async stopService () {
    await super.stopService()

    const wsTransport = this.container.get(TYPES.WSTransport)

    wsTransport.stop()
  }
}

module.exports = WrkReportFrameWorkApi
