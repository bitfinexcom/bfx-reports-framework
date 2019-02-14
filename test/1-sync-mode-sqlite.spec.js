'use strict'

const path = require('path')
const { assert } = require('chai')
const request = require('supertest')

const {
  startEnviroment,
  stopEnviroment
} = require('bfx-report/test/helpers/helpers.boot')
const {
  rmDB,
  rmAllFiles,
  queueToPromise,
  queueToPromiseMulti,
  delay,
  connToSQLite,
  closeSQLite
} = require('bfx-report/test/helpers/helpers.core')
const {
  createMockRESTv2SrvWithDate
} = require('bfx-report/test/helpers/helpers.mock-rest-v2')
const {
  testMethodOfGettingCsv,
  testProcQueue
} = require('bfx-report/test/helpers/helpers.tests')

process.env.NODE_CONFIG_DIR = path.join(__dirname, 'config')
const { app } = require('bfx-report-express')
const agent = request.agent(app)

let wrkReportServiceApi = null
let auth = {
  apiKey: 'fake',
  apiSecret: 'fake'
}
let processorQueue = null
let aggregatorQueue = null
let mockRESTv2Srv = null
let db = null

const basePath = '/api'
const tempDirPath = path.join(__dirname, '..', 'workers/loc.api/queue/temp')
const dbDirPath = path.join(__dirname, '..', 'db')
const date = new Date()
const end = date.getTime()
const start = (new Date()).setDate(date.getDate() - 90)
const email = 'fake@email.fake'

describe('Sync mode with SQLite', () => {
  before(async function () {
    this.timeout(20000)

    mockRESTv2Srv = createMockRESTv2SrvWithDate(start, end, 100)

    await rmAllFiles(tempDirPath)
    await rmDB(dbDirPath)
    const env = await startEnviroment(false, false, 1, {
      syncMode: true,
      isSchedulerEnabled: true,
      dbDriver: 'sqlite'
    })

    wrkReportServiceApi = env.wrksReportServiceApi[0]
    processorQueue = wrkReportServiceApi.lokue_processor.q
    aggregatorQueue = wrkReportServiceApi.lokue_aggregator.q

    db = await connToSQLite(wrkReportServiceApi)
  })

  after(async function () {
    this.timeout(5000)

    await stopEnviroment()
    await closeSQLite(db)
    await rmDB(dbDirPath)
    await rmAllFiles(tempDirPath)

    try {
      await mockRESTv2Srv.close()
    } catch (err) { }
  })
})
