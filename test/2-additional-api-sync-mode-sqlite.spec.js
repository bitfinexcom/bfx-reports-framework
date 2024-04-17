'use strict'

const path = require('path')
const { omit } = require('lib-js-util-base')
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
  emptyDB,
  rmRf
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
const reportFolderPath = path.join(__dirname, '..', 'report-files')
const date = new Date()
const end = date.getTime()
const start = (new Date()).setDate(date.getDate() - 90)

const apiKeys = {
  apiKey: 'fake',
  apiSecret: 'fake'
}
const authToken = 'pub:api:18b3f4d5-1944-4516-9cfc-59e11e3ded4d-caps:s:o:f:w:wd:a-write'
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
  const paramsWithAuthToken = {
    ...omit(params, ['apiKeys']),
    authToken
  }

  before(async function () {
    this.timeout(20000)

    mockRESTv2Srv = createMockRESTv2SrvWithDate(start, end, 100)

    await rmRf(reportFolderPath)
    await rmAllFiles(tempDirPath, ['README.md'])
    await rmDB(dbDirPath)
    const env = await startEnvironment(false, false, 1)

    wrkReportServiceApi = env.wrksReportServiceApi[0]
    params.processorQueue = wrkReportServiceApi.lokue_processor.q
    params.aggregatorQueue = wrkReportServiceApi.lokue_aggregator.q
    paramsWithAuthToken.processorQueue = wrkReportServiceApi.lokue_processor.q
    paramsWithAuthToken.aggregatorQueue = wrkReportServiceApi.lokue_aggregator.q

    await emptyDB()
  })

  after(async function () {
    this.timeout(20000)

    await stopEnvironment()
    await rmDB(dbDirPath)
    await rmAllFiles(tempDirPath, ['README.md'])
    await rmRf(reportFolderPath)

    try {
      await mockRESTv2Srv.close()
    } catch (err) { }
  })

  describe('Use BFX API keys', () => {
    describe('CSV generation', () => {
      params.isPDFRequired = false
      signUpTestCase(agent, params)
      additionalApiSyncModeSqliteTestCases(agent, params)
    })

    describe('PDF generation', () => {
      params.isPDFRequired = true
      signUpTestCase(agent, params)
      additionalApiSyncModeSqliteTestCases(agent, params)
    })
  })

  describe('Use BFX auth token', () => {
    before(async function () {
      this.timeout(20000)

      await rmRf(reportFolderPath)
      await rmAllFiles(tempDirPath, ['README.md'])
    })

    describe('CSV generation', () => {
      paramsWithAuthToken.isPDFRequired = false
      signUpTestCase(agent, paramsWithAuthToken)
      additionalApiSyncModeSqliteTestCases(agent, paramsWithAuthToken)
    })

    describe('PDF generation', () => {
      paramsWithAuthToken.isPDFRequired = true
      signUpTestCase(agent, paramsWithAuthToken)
      additionalApiSyncModeSqliteTestCases(agent, paramsWithAuthToken)
    })
  })
})
