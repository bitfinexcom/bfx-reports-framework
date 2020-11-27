'use strict'

const path = require('path')
const request = require('supertest')

const {
  stopEnvironment
} = require('bfx-report/test/helpers/helpers.boot')
const {
  rmDB,
  rmAllFiles
} = require('bfx-report/test/helpers/helpers.core')

const {
  startEnvironment
} = require('./helpers/helpers.boot')
const {
  emptyDB
} = require('./helpers/helpers.core')
const {
  createMockRESTv2SrvWithDate
} = require('./helpers/helpers.mock-rest-v2')

process.env.NODE_CONFIG_DIR = path.join(__dirname, 'config')
const { app } = require('bfx-report-express')
const agent = request.agent(app)

const {
  additionalApiSyncModeSqliteTestCases,
  signUpTestCase
} = require('./test-cases')

let wrkReportServiceApi = null
let mockRESTv2Srv = null

const basePath = '/api'
const tempDirPath = path.join(__dirname, '..', 'workers/loc.api/queue/temp')
const dbDirPath = path.join(__dirname, '..', 'db')
const date = new Date()
const end = date.getTime()
const start = (new Date()).setDate(date.getDate() - 90)

const apiKeys = {
  apiKey: 'fake',
  apiSecret: 'fake'
}
const email = 'fake@email.fake'
const password = '123Qwerty'
const isSubAccount = false

describe('Additional sync mode API with SQLite', () => {
  const params = {
    processorQueue: null,
    aggregatorQueue: null,
    basePath,
    auth: {
      email,
      password,
      isSubAccount
    },
    apiKeys,
    date,
    end,
    start
  }

  before(async function () {
    this.timeout(20000)

    mockRESTv2Srv = createMockRESTv2SrvWithDate(start, end, 100)

    await rmAllFiles(tempDirPath, ['README.md'])
    await rmDB(dbDirPath)
    const env = await startEnvironment(false, false, 1)

    wrkReportServiceApi = env.wrksReportServiceApi[0]
    params.processorQueue = wrkReportServiceApi.lokue_processor.q
    params.aggregatorQueue = wrkReportServiceApi.lokue_aggregator.q

    await emptyDB()
  })

  after(async function () {
    this.timeout(5000)

    await stopEnvironment()
    await rmDB(dbDirPath)
    await rmAllFiles(tempDirPath, ['README.md'])

    try {
      await mockRESTv2Srv.close()
    } catch (err) { }
  })

  signUpTestCase(agent, params)
  additionalApiSyncModeSqliteTestCases(agent, params)
})
