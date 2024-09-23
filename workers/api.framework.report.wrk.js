'use strict'

const fs = require('node:fs')

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

const {
  PDFBufferUnderElectronCreationError
} = require('bfx-report/workers/loc.api/errors')

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
    this.addTransLocation(path.join(__dirname, '../locales'))

    this.conf[this.group].dbPathAbsolute = path.isAbsolute(argv.dbFolder)
      ? argv.dbFolder
      : path.join(this.ctx.root, argv.dbFolder)
    const workerPathAbsolute = path.join(
      this.ctx.root,
      'workers/loc.api/sync/dao/sqlite-worker/index.js'
    )

    const {
      syncMode,
      dbDriver,
      verboseSql,
      dbPathAbsolute
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
    this.rmLokueDbIfJSONDamaged()
  }

  rmLokueDbIfJSONDamaged () {
    for (const fac of this.conf.init.facilities) {
      // eslint-disable-next-line no-unused-vars
      const [type, facName, ns, label, opts] = fac

      if (facName !== 'bfx-facs-lokue') {
        continue
      }

      const { dbPathAbsolute, name } = opts
      const baseLokueDbFileName = ['lokue', name, label].join('_')
      const pathToLokueDbFile = path.join(
        dbPathAbsolute,
        `${baseLokueDbFileName}.db.json`
      )

      try {
        require(pathToLokueDbFile)
      } catch (err) {
        fs.rmSync(pathToLokueDbFile, { force: true, maxRetries: 3 })
      }
    }
  }

  async initService (deps) {
    await super.initService({
      grcBfxOpts: this.grc_bfx.opts,
      ...deps
    })

    const processorQueue = this.lokue_processor.q
    const aggregatorQueue = this.lokue_aggregator.q
    const conf = this.conf[this.group]
    const wsTransport = this.container.get(TYPES.WSTransport)
    const wsEventEmitter = this.container.get(TYPES.WSEventEmitter)
    const sync = this.container.get(TYPES.Sync)
    const processMessageManager = this.container.get(TYPES.ProcessMessageManager)

    await wsTransport.start()

    processorQueue.on('error:base', (err, job) => {
      if (!(err instanceof PDFBufferUnderElectronCreationError)) {
        return
      }

      wsEventEmitter.emitReportFileGenerationFailedToOne(
        { reportFilesMetadata: null },
        job?.data?.userInfo
      ).then(() => {}, (err) => {
        this.logger.error(`WS_EVENT_EMITTER:REPORT_FILE_FAILED: ${err.stack || err}`)
      })
    })
    aggregatorQueue.on('completed', (res) => {
      const {
        reportFilesMetadata,
        csvFilesMetadata, // For compatibility with old implementation
        userInfo
      } = res ?? {}

      wsEventEmitter.emitReportFileGenerationCompletedToOne(
        { reportFilesMetadata: reportFilesMetadata ?? csvFilesMetadata },
        userInfo
      ).then(() => {}, (err) => {
        this.logger.error(`WS_EVENT_EMITTER:REPORT_FILE_COMPLETED: ${err.stack || err}`)
      })
    })

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

    this.scheduler_sync
      .add(name, () => sync.start({ isOwnerScheduler: true }), rule)
    this.scheduler_sync.mem.get(name).rule = rule

    processMessageManager.sendState(
      processMessageManager.PROCESS_MESSAGES.READY_WORKER
    )
  }

  async stopService () {
    await super.stopService()

    const wsTransport = this.container.get(TYPES.WSTransport)
    const processMessageManager = this.container.get(TYPES.ProcessMessageManagerFactory)()

    processMessageManager.stop()
    wsTransport.stop()
  }
}

module.exports = WrkReportFrameWorkApi
